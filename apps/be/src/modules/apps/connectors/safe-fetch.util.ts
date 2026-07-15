import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

/**
 * SSRF-hardened fetch for connectors that take an operator-supplied URL (RSS).
 *
 * Without this, an operator could point a feed at `http://169.254.169.254/...`
 * (cloud metadata), `http://localhost`, or an internal service and exfiltrate
 * the response via the fan-out payload onto their own screen. We therefore:
 *   - allow only http/https,
 *   - resolve the host and reject private / loopback / link-local / reserved IPs,
 *   - follow redirects OURSELVES, re-checking the host at every hop,
 *   - cap the response body size and apply a hard timeout.
 *
 * On redirects: refusing them outright is tempting and was the first instinct,
 * but it makes the guard unusable — `http://feeds.bbci.co.uk/news/rss.xml` and
 * `https://news.google.com/rss` both answer 302, and those are exactly the
 * addresses an operator copies off a site. Following them blindly is the actual
 * vulnerability (a public URL 30x-ing into `169.254.169.254`). So we follow them
 * by hand and run the same public-host check on every hop, which is both safer
 * than blind following and more useful than a blanket refusal.
 *
 * The DNS check is best-effort against rebinding (the kernel re-resolves on
 * connect); for MVP it blocks the overwhelming majority of SSRF attempts. A
 * pinned-IP dispatcher is the hardening follow-up if connectors ever fetch
 * sensitive internal-adjacent data.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous for any feed/document.
const DEFAULT_TIMEOUT_MS = 15_000;
/** Enough for the http→https→cdn chains feeds really use; short of a loop. */
const MAX_REDIRECTS = 5;

export interface SafeFetchOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
  maxBytes?: number;
}

export class SsrfBlockedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

/** Fetch `url` as text with SSRF protection; throws on blocked/oversized/error. */
export async function safeFetchText(
  url: string,
  options: SafeFetchOptions = {},
): Promise<string> {
  const parsed = parseHttpUrl(url);
  await assertPublicHost(parsed.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
  );
  // Abort if the caller's signal fires too.
  const onAbort = (): void => controller.abort();
  options.signal?.addEventListener('abort', onAbort, { once: true });

  try {
    const response = await fetchFollowingRedirects(parsed, controller.signal);
    return await readCapped(response, options.maxBytes ?? MAX_BYTES);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
}

/**
 * Walk the redirect chain by hand, validating every hop before we follow it.
 * `redirect: 'manual'` is what makes this possible: unlike a browser, Node hands
 * back the real 3xx response with its `Location` intact.
 */
async function fetchFollowingRedirects(
  start: URL,
  signal: AbortSignal,
): Promise<Response> {
  let current = start;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    // Re-checked per hop — this is the whole point. The first URL being public
    // says nothing about where it forwards us.
    await assertPublicHost(current.hostname);

    const response = await fetch(current.toString(), {
      signal,
      redirect: 'manual',
    });

    if (response.status < 300 || response.status >= 400) {
      if (!response.ok) {
        throw new Error(`upstream ${response.status}`);
      }
      return response;
    }

    const location = response.headers.get('location');
    if (location === null || location === '') {
      throw new Error(`upstream ${response.status} with no location`);
    }
    // Relative Locations are legal and common; resolve against the current hop,
    // then re-require http(s) so a `Location: file:///etc/passwd` goes nowhere.
    current = parseHttpUrl(new URL(location, current).toString());
  }

  throw new SsrfBlockedError(`Too many redirects (over ${MAX_REDIRECTS})`);
}

/** Parse and require an http(s) URL. */
function parseHttpUrl(url: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new SsrfBlockedError('Invalid URL');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError(`Unsupported protocol: ${parsed.protocol}`);
  }
  return parsed;
}

/** Resolve the host and reject any private / loopback / reserved address. */
async function assertPublicHost(hostname: string): Promise<void> {
  const literal = stripBrackets(hostname);
  if (isIP(literal)) {
    rejectIfPrivate(literal);
    return;
  }
  // A bare hostname like `localhost` never resolves to a public address, but
  // resolving covers it (→ 127.0.0.1) along with any host that maps to a
  // private range.
  const records = await lookup(hostname, { all: true });
  if (records.length === 0) {
    throw new SsrfBlockedError(`Host does not resolve: ${hostname}`);
  }
  for (const record of records) {
    rejectIfPrivate(record.address);
  }
}

function stripBrackets(host: string): string {
  return host.startsWith('[') && host.endsWith(']') ? host.slice(1, -1) : host;
}

function rejectIfPrivate(ip: string): void {
  if (isPrivateAddress(ip)) {
    throw new SsrfBlockedError(`Blocked non-public address: ${ip}`);
  }
}

/** True for loopback, private, link-local, CGNAT and other reserved ranges. */
function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split('.').map(Number);
    const [a, b] = parts;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 0) return true; // 0.0.0.0/8
    if (a === 169 && b === 254) return true; // link-local (cloud metadata)
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }

  // IPv6
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true; // loopback / unspecified
  if (lower.startsWith('fe80')) return true; // link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // ULA fc00::/7
  // IPv4-mapped (::ffff:a.b.c.d) — re-check the embedded v4.
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(lower);
  if (mapped) return isPrivateAddress(mapped[1]);
  return false;
}

/** Read the body but abort once it exceeds `maxBytes`. */
async function readCapped(
  response: Response,
  maxBytes: number,
): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) {
    return response.text();
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.length;
      if (total > maxBytes) {
        await reader.cancel();
        throw new SsrfBlockedError('Response exceeds size limit');
      }
      chunks.push(value);
    }
  }
  return Buffer.concat(chunks).toString('utf8');
}
