/**
 * URL-based identity recovery.
 *
 * The player's stable identity is its `deviceId` (a UUID persisted in
 * localStorage — see `device.ts`). If that storage is wiped (a kiosk that clears
 * storage, a manual clear, a cache purge) the device would otherwise mint a brand
 * new identity and strand its paired screen on the old, orphaned `deviceId`.
 *
 * To make that recoverable we mirror the `deviceId` into the URL as
 * `?device=<uuid>`. Because the backend re-issues a token for a known `deviceId`
 * that reconnects over the `/player` socket without a valid one, simply restoring
 * the old `deviceId` is enough to slide straight back into the paired screen — no
 * operator action, no new endpoint. So reopening the same URL (or the CMS
 * "Open web player" link, which carries the paired screen's `deviceId`) fully
 * recovers a device whose localStorage was cleared.
 *
 * We deliberately carry the `deviceId`, not the pairing code: the code is
 * ephemeral (expires and is cleared once paired) and short enough to guess, which
 * would make a code-based recovery both unreliable and a screen-hijack risk.
 *
 * SECURITY: the flip side of that re-issue behavior is that the `deviceId` acts as
 * a recovery credential — any browser that presents a known paired `deviceId` is
 * admitted as that device (the backend does not prove prior token ownership). So
 * this value, once mirrored into the URL, must be treated as sensitive (it leaks
 * through history, `Referer`, and server logs). It is a 122-bit UUID, so the risk
 * is disclosure of the URL, not guessing. `localStorage` winning over the URL only
 * protects a machine that is ALREADY paired locally; it does not protect a fresh
 * browser opened with someone else's link.
 */

const DEVICE_PARAM = 'device'

/** RFC-4122 UUID shape; guards against adopting a garbage `?device=` value. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Reads the recovery `deviceId` from the URL, or undefined when absent or
 * malformed. Callers use this ONLY as a fallback when localStorage holds no
 * identity — a present local identity always wins, so opening someone else's
 * link can never hijack a device that is already paired on this machine.
 */
export function getUrlDeviceId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const raw = new URLSearchParams(window.location.search).get(DEVICE_PARAM)
  if (!raw || !UUID_RE.test(raw)) {
    return undefined
  }
  return raw.toLowerCase()
}

/**
 * Reflects the current `deviceId` into the URL (via replaceState, so no reload or
 * history entry) making this tab a durable bookmark: if localStorage is later
 * wiped, reopening this URL recovers the same identity. No-op when the URL already
 * carries this id. Best-effort — a failure here never blocks boot.
 */
export function reflectDeviceIdInUrl(deviceId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const url = new URL(window.location.href)
    if (url.searchParams.get(DEVICE_PARAM) === deviceId) {
      return
    }
    url.searchParams.set(DEVICE_PARAM, deviceId)
    window.history.replaceState(null, '', url)
  } catch {
    // Non-fatal: recovery still works when the CMS link carries ?device=.
  }
}
