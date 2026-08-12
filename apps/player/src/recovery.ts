/**
 * URL-based identity recovery.
 *
 * The player's stable identity is its `deviceId` (a UUID persisted in
 * localStorage — see `device.ts`). If that storage is wiped (a kiosk that clears
 * storage, a manual clear, a cache purge) the device would otherwise mint a brand
 * new identity and strand its paired screen on the old, orphaned `deviceId`.
 *
 * To make that recoverable we mirror the `deviceId` into the URL as
 * `?device=<uuid>`, and the operator's "Open web player" link additionally
 * carries a single-use grant as `?recovery=<code>`. Restoring the `deviceId`
 * alone is NOT enough to re-enter the paired screen — it only names which
 * device is being claimed. Admission needs one of:
 *
 *   - the device token this browser still holds (the ordinary case, where
 *     nothing was actually lost), or
 *   - a `?recovery=<code>` grant an operator just minted in the CMS.
 *
 * Anything else is refused, so recovering a genuinely wiped screen is an
 * explicit operator action rather than something a stale URL does silently.
 *
 * We deliberately carry the `deviceId`, not the pairing code: the code is
 * ephemeral (expires and is cleared once paired) and short enough to guess, which
 * would make a code-based recovery both unreliable and a screen-hijack risk.
 *
 * SECURITY: the `deviceId` alone is identity, NOT a credential. The backend
 * admits a paired device only on proof of possession (its device token) or a
 * single-use, short-lived recovery code minted by an operator in the CMS
 * (`?recovery=<code>`, carried by the "Open web player" link). A bare known
 * `deviceId` without either is refused with `recovery:required`, and the
 * player resets to a fresh identity and the normal pairing flow — so a leaked
 * URL cannot hijack a screen. `localStorage` winning over the URL additionally
 * means a machine that is already paired locally never adopts someone else's
 * link.
 */

const DEVICE_PARAM = 'device'
const RECOVERY_PARAM = 'recovery'

/** base64url token shape (the backend mints 32 bytes → 43 chars). */
const RECOVERY_CODE_RE = /^[A-Za-z0-9_-]{16,256}$/

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

/**
 * Reads the single-use recovery code from the URL (`?recovery=<code>`), minted
 * by the CMS "Open web player" action. Sent once on connect; the server
 * consumes it atomically, and {@link clearUrlRecoveryCode} strips it after a
 * successful pairing so it never lingers in the address bar.
 */
export function getUrlRecoveryCode(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  const raw = new URLSearchParams(window.location.search).get(RECOVERY_PARAM)
  if (!raw || !RECOVERY_CODE_RE.test(raw)) {
    return undefined
  }
  return raw
}

/** Strips the consumed (or refused) recovery code from the URL. Best effort. */
export function clearUrlRecoveryCode(): void {
  removeUrlParam(RECOVERY_PARAM)
}

/**
 * Strips the `?device=` identity anchor. Called when the server refuses this
 * identity (`recovery:required`) — leaving it in place would make the fresh
 * boot re-adopt the very id that was just refused, looping forever.
 */
export function clearUrlDeviceId(): void {
  removeUrlParam(DEVICE_PARAM)
}

function removeUrlParam(name: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const url = new URL(window.location.href)
    if (!url.searchParams.has(name)) {
      return
    }
    url.searchParams.delete(name)
    window.history.replaceState(null, '', url)
  } catch {
    // Non-fatal.
  }
}
