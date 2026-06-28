// The playback engine schedules work via `window.setTimeout`/`setInterval`. The
// node test environment has no `window`, so alias it to the global scope —
// vitest's fake timers patch the globals, which then drive the engine's timers.
;(globalThis as { window?: unknown }).window = globalThis

// `__APP_VERSION__` is injected by Vite's `define` at build time; provide a stub
// so importing `config` (transitively pulled in by device/socket modules under
// test) doesn't throw on the missing global.
;(globalThis as { __APP_VERSION__?: string }).__APP_VERSION__ = 'test'

// Prefetch warms the SW cache via fetch(). Stub it to a resolved no-op so tests
// never touch the network; `caches` stays undefined (isCached -> false) and
// `navigator.storage` is absent (overStorageBudget -> false), leaving prefetch
// an inert background loop that the engine already swallows failures from.
globalThis.fetch = (() =>
  Promise.resolve(new Response(null, { status: 200 }))) as typeof fetch
