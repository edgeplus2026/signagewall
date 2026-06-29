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
 *   - disable redirects (a public URL can 30x into an internal one),
 *   - cap the response body size and apply a hard timeout.
 *
 * The DNS check is best-effort against rebinding (the kernel re-resolves on
 * connect); for MVP it blocks the overwhelming majority of SSRF attempts. A
 * pinned-IP dispatcher is the hardening follow-up if connectors ever fetch
 * sensitive internal-adjacent data.
 */

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB — generous for any feed/document.
const DEFAULT_TIMEOUT_MS = 15_000;

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
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'error', // a public URL must not 30x into an internal one.
    });
    if (!response.ok) {
      throw new Error(`upstream ${response.status}`);
    }
    return await readCapped(response, options.maxBytes ?? MAX_BYTES);
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', onAbort);
  }
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
