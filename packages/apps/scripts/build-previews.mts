/**
 * Renders the template thumbnails the CMS config form shows for any `select`
 * field marked with `previewGallery` (see `apps-contract/field-schema.ts`).
 *
 * It drives the REAL embed bundles over the REAL host protocol — the same
 * handshake `apps/cms/.../appHostBridge.ts` uses for the live preview — so a
 * thumbnail cannot drift from what the operator gets when they pick it. For each
 * option value it screenshots a 1920×1080 frame and writes
 * `previews/<namespace>/<value>.webp`.
 *
 *   pnpm --filter @signagewall/apps build:embeds   # bundles must exist first
 *   pnpm --filter @signagewall/apps previews
 *
 * Then COMMIT the images: they are checked in, not built on deploy, so nothing
 * needs a headless browser in CI. Re-run it whenever a template is added or a
 * design changes.
 *
 * Two things make the output reproducible and are easy to break:
 *
 *  - **1920×1080 is mandatory.** The apps size themselves in `vw`/`vh`, so a
 *    thumbnail-sized viewport does not render a small version of the design — it
 *    renders a different one (same reason `ScaledViewport` exists in the CMS).
 *    Capture full-size, downscale afterwards.
 *  - **Emulated `prefers-reduced-motion: reduce`.** The embeds' reduced-motion
 *    CSS is written to leave every layout in its FINAL state (weather even
 *    resets the curve's `clip-path` so it isn't clipped to nothing). Without it
 *    the capture lands at an arbitrary point in an entrance animation.
 *
 * Chrome is driven over the DevTools protocol rather than `--screenshot`,
 * because Chrome's CLI screenshot flag hangs indefinitely under the current
 * headless mode (reproduced on 151). CDP is also better here: one browser for
 * the whole run, and the capture waits on a readiness signal the harness sets
 * instead of on a fixed timeout.
 */

import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import sharp from 'sharp'

import { buildDefaultConfig } from '@signagewall/apps-contract'

import { APP_MANIFESTS } from '../src/index.js'
import { buildFixtures, PLACEHOLDER_ART, type PreviewFixture } from '../previews/fixtures.js'

const dir = path.dirname(fileURLToPath(import.meta.url))
const packageRoot = path.resolve(dir, '..')
/** The built bundles, served as the document root (same layout the player uses). */
const bundlesDir = path.resolve(packageRoot, '../../apps/player/public/apps')
const previewsDir = path.resolve(packageRoot, 'previews')

/** Signage is 16:9; the CMS card is ~150px wide, so 640×360 is 2× for retina. */
const THUMB_WIDTH = 640
const THUMB_HEIGHT = 360
const CAPTURE_WIDTH = 1920
const CAPTURE_HEIGHT = 1080
/** Beat between "fonts loaded" and the shot, for image decode + first layout. */
const SETTLE_MS = 900

const CHROME_BIN =
  process.env.CHROME_BIN ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

/** Deterministic per-name pseudo-randomness, so re-runs place blobs alike. */
function hashOf(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  }
  return hash >>> 0
}

/** Mix a hex colour toward white (`amount > 0`) or black (`amount < 0`). */
function shift(hex: string, amount: number): string {
  const value = Number.parseInt(hex.slice(1), 16)
  const channel = (offset: number): number => {
    const base = (value >> offset) & 0xff
    const target = amount > 0 ? 255 : 0
    return Math.round(base + (target - base) * Math.abs(amount))
  }
  return `#${[channel(16), channel(8), channel(0)]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')}`
}

/**
 * Stands in for a photograph. Real photos would mean committing binary art with
 * licensing to track, so this composes a duotone base with a handful of soft
 * out-of-focus blobs instead.
 *
 * The blobs matter: a plain two-stop gradient reads as an unloaded image in the
 * layouts where a picture fills the frame (`rss/cover`, `social/spotlight`),
 * which makes a working design look broken. Varied luminance across the frame is
 * what makes it read as depth of field at thumbnail size.
 */
async function placeholderJpeg(name: string, from: string, to: string): Promise<Buffer> {
  const seed = hashOf(name)
  const blobs = Array.from({ length: 5 }, (_, i) => {
    const r = (seed >> (i * 5)) % 1000
    const cx = 120 + ((r * 7) % 960)
    const cy = 90 + ((r * 13) % 720)
    const rx = 220 + ((r * 3) % 320)
    const ry = 180 + ((r * 5) % 280)
    // Alternate lighter and darker so the frame has a light direction.
    const fill = i % 2 === 0 ? shift(to, 0.3) : shift(from, -0.25)
    const opacity = 0.35 + ((r % 30) / 100)
    return `<ellipse cx="${String(cx)}" cy="${String(cy)}" rx="${String(rx)}" ry="${String(ry)}" fill="${fill}" opacity="${opacity.toFixed(2)}"/>`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${from}"/>
        <stop offset="100%" stop-color="${to}"/>
      </linearGradient>
      <radialGradient id="v" cx="0.42" cy="0.34" r="0.8">
        <stop offset="0%" stop-color="#fff" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="#000" stop-opacity="0.42"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="900" fill="url(#g)"/>
    ${blobs}
    <rect width="1200" height="900" fill="url(#v)"/>
  </svg>`
  return sharp(Buffer.from(svg)).blur(26).jpeg({ quality: 84 }).toBuffer()
}

interface PreviewServer {
  /** `http://127.0.0.1:<port>` — the origin every fixture URL is built from. */
  origin: string
  /** Publish a harness document at `route` before pointing Chrome at it. */
  register: (route: string, html: string) => void
  close: () => Promise<void>
}

/** Serves the built bundles plus the generated placeholder art, same-origin. */
async function startServer(): Promise<PreviewServer> {
  const assets = new Map<string, Buffer>()
  for (const [name, [from, to]] of Object.entries(PLACEHOLDER_ART)) {
    assets.set(`/_assets/${name}.jpg`, await placeholderJpeg(name, from, to))
  }

  const harnesses = new Map<string, string>()

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    const pathname = decodeURIComponent(url.pathname)

    const harness = harnesses.get(pathname)
    if (harness !== undefined) {
      res.writeHead(200, { 'content-type': MIME['.html'] })
      res.end(harness)
      return
    }

    const asset = assets.get(pathname)
    if (asset) {
      res.writeHead(200, { 'content-type': MIME['.jpg'] })
      res.end(asset)
      return
    }

    // Everything else comes off disk, confined to the bundles directory.
    const filePath = path.join(bundlesDir, pathname)
    if (!filePath.startsWith(bundlesDir)) {
      res.writeHead(403).end()
      return
    }
    readFile(filePath).then(
      (body) => {
        res.writeHead(200, { 'content-type': MIME[path.extname(filePath)] ?? 'application/octet-stream' })
        res.end(body)
      },
      () => {
        res.writeHead(404).end()
      },
    )
  })

  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  if (address === null || typeof address === 'string') {
    throw new Error('Preview server did not bind to a port')
  }

  return {
    origin: `http://127.0.0.1:${String(address.port)}`,
    register: (route, html) => {
      harnesses.set(route, html)
    },
    close: () =>
      new Promise<void>((resolve) => {
        server.close(() => {
          resolve()
        })
      }),
  }
}

/**
 * The host page: iframes the bundle at exactly 1920×1080 and runs the protocol
 * from `apps-contract/host-protocol.ts` — wait for `app-ready`, send
 * `app-config`, then `app-active`. Deliberately inlined rather than imported so
 * the harness stays a single self-contained document Chrome can just open.
 *
 * It sets `window.__previewReady` once the app has been configured, its webfonts
 * have loaded and a settle delay has passed. The capture polls that flag, so a
 * slow bundle delays the screenshot instead of being caught half-painted.
 */
function harnessHtml(slug: string, config: unknown, data: unknown): string {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
  html,body{margin:0;padding:0;background:#000;overflow:hidden}
  iframe{width:${String(CAPTURE_WIDTH)}px;height:${String(CAPTURE_HEIGHT)}px;border:0;display:block}
</style></head>
<body>
<iframe id="f" src="/${slug}/index.html"></iframe>
<script>
  var frame = document.getElementById('f')
  var config = ${JSON.stringify(config)}
  var data = ${JSON.stringify(data)}
  window.__previewReady = false
  window.addEventListener('message', function (event) {
    if (event.source !== frame.contentWindow) return
    if (!event.data || event.data.type !== 'app-ready') return
    frame.contentWindow.postMessage({ type: 'app-config', config: config, data: data, meta: null }, '*')
    frame.contentWindow.postMessage({ type: 'app-active', active: true, muted: true }, '*')
    var doc = frame.contentDocument
    var fonts = doc && doc.fonts ? doc.fonts.ready : Promise.resolve()
    fonts.then(function () {
      // One settle beat for images decoding and the first layout pass.
      setTimeout(function () { window.__previewReady = true }, ${String(SETTLE_MS)})
    })
  })
</script>
</body></html>`
}

/** Minimal DevTools-protocol client — just enough to open a tab and shoot it. */
class Cdp {
  private readonly socket: WebSocket
  private nextId = 1
  private readonly pending = new Map<
    number,
    { resolve: (value: Record<string, unknown>) => void; reject: (error: Error) => void }
  >()

  private constructor(socket: WebSocket) {
    this.socket = socket
    this.socket.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data)) as {
        id?: number
        result?: Record<string, unknown>
        error?: { message: string }
      }
      if (message.id === undefined) return
      const waiter = this.pending.get(message.id)
      if (!waiter) return
      this.pending.delete(message.id)
      if (message.error) waiter.reject(new Error(message.error.message))
      else waiter.resolve(message.result ?? {})
    })
  }

  static async connect(url: string): Promise<Cdp> {
    const socket = new WebSocket(url)
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => {
        resolve()
      })
      socket.addEventListener('error', () => {
        reject(new Error(`Could not connect to ${url}`))
      })
    })
    return new Cdp(socket)
  }

  send(
    method: string,
    params: Record<string, unknown> = {},
    sessionId?: string,
  ): Promise<Record<string, unknown>> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.socket.send(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }))
    })
  }

  close(): void {
    this.socket.close()
  }
}

interface Browser {
  capture: (url: string) => Promise<Buffer>
  close: () => Promise<void>
}

/** Launches one headless Chrome for the whole run and returns a capture fn. */
async function launchBrowser(): Promise<Browser> {
  const userDataDir = await mkdtemp(path.join(tmpdir(), 'sw-previews-'))
  const child = spawn(
    CHROME_BIN,
    [
      '--headless=new',
      '--remote-debugging-port=0',
      '--no-sandbox',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--disable-extensions',
      // Otherwise a backgrounded tab throttles its timers and the app never
      // finishes its first render.
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--disable-backgrounding-occluded-windows',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ],
    { stdio: 'ignore' },
  )

  // Chrome writes the port it actually bound to into DevToolsActivePort.
  const portFile = path.join(userDataDir, 'DevToolsActivePort')
  let port = ''
  for (let attempt = 0; attempt < 100 && port === ''; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 100))
    try {
      port = (await readFile(portFile, 'utf8')).split('\n')[0]?.trim() ?? ''
    } catch {
      // Not written yet.
    }
  }
  if (port === '') {
    child.kill('SIGKILL')
    throw new Error('Chrome did not expose a DevTools port')
  }

  const version = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()) as {
    webSocketDebuggerUrl: string
  }
  const cdp = await Cdp.connect(version.webSocketDebuggerUrl)

  return {
    async capture(url) {
      const { targetId } = (await cdp.send('Target.createTarget', { url: 'about:blank' })) as {
        targetId: string
      }
      const { sessionId } = (await cdp.send('Target.attachToTarget', {
        targetId,
        flatten: true,
      })) as { sessionId: string }

      try {
        await cdp.send(
          'Emulation.setDeviceMetricsOverride',
          { width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT, deviceScaleFactor: 1, mobile: false },
          sessionId,
        )
        // The lever that makes captures reproducible — see the file header.
        await cdp.send(
          'Emulation.setEmulatedMedia',
          { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] },
          sessionId,
        )
        await cdp.send('Page.enable', {}, sessionId)
        await cdp.send('Page.navigate', { url }, sessionId)

        // Poll the harness's readiness flag rather than guessing a duration.
        let ready = false
        for (let attempt = 0; attempt < 120 && !ready; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 100))
          const evaluated = (await cdp.send(
            'Runtime.evaluate',
            { expression: 'window.__previewReady === true', returnByValue: true },
            sessionId,
          )) as { result?: { value?: unknown } }
          ready = evaluated.result?.value === true
        }
        if (!ready) {
          throw new Error(`App never signalled ready: ${url}`)
        }

        const shot = (await cdp.send(
          'Page.captureScreenshot',
          { format: 'png', captureBeyondViewport: false },
          sessionId,
        )) as { data: string }
        return Buffer.from(shot.data, 'base64')
      } finally {
        await cdp.send('Target.closeTarget', { targetId })
      }
    },
    async close() {
      cdp.close()
      child.kill('SIGKILL')
      await rm(userDataDir, { recursive: true, force: true })
    },
  }
}

async function main(): Promise<void> {
  if (!existsSync(bundlesDir)) {
    throw new Error(
      `No embed bundles at ${bundlesDir}.\nRun: pnpm --filter @signagewall/apps build:embeds`,
    )
  }

  const server = await startServer()
  const fixtures = buildFixtures(server.origin)
  const browser = await launchBrowser()

  let written = 0
  try {
    for (const [namespace, fixture] of Object.entries(fixtures) as [string, PreviewFixture][]) {
      const manifest = APP_MANIFESTS.find((entry) => entry.slug === fixture.slug)
      if (!manifest) {
        throw new Error(`Fixture "${namespace}" names unknown app slug "${fixture.slug}"`)
      }
      const outDir = path.join(previewsDir, namespace)
      await mkdir(outDir, { recursive: true })

      for (const value of fixture.values) {
        const config = {
          ...buildDefaultConfig(manifest.configSchema),
          ...fixture.config,
          ...(fixture.overrides?.[value] ?? {}),
          [fixture.field]: value,
        }
        const route = `/_harness/${namespace}/${value}.html`
        server.register(route, harnessHtml(fixture.slug, config, fixture.data))

        const png = await browser.capture(`${server.origin}${route}`)

        await sharp(png)
          .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: 'cover' })
          .webp({ quality: 82 })
          .toFile(path.join(outDir, `${value}.webp`))

        written += 1
        console.log(`  ✓ ${namespace}/${value}.webp`)
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  console.log(`\n${String(written)} thumbnails written to previews/ — review them, then commit.`)
}

await main()
