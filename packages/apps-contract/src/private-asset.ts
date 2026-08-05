/**
 * Credential-free reference persisted in connector payloads.
 *
 * `key` must identify an immutable, versioned object in private storage. It is
 * deliberately not a URL: possession of this value grants no access to bytes.
 */
export interface PrivateAssetRef {
  kind: 'private-asset'
  key: string
  version: string
  mimeType: string
}

/** A private reference hydrated only at an authorized delivery boundary. */
export interface HydratedPrivateAssetRef extends PrivateAssetRef {
  /** Short-lived URL added only for an authorized preview/player snapshot. */
  url: string
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

/** Runtime guard for credential-free connector payload references. */
export function isPrivateAssetRef(value: unknown): value is PrivateAssetRef {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const candidate = value as Record<string, unknown>
  return (
    candidate.kind === 'private-asset' &&
    isNonEmptyString(candidate.key) &&
    isNonEmptyString(candidate.version) &&
    isNonEmptyString(candidate.mimeType)
  )
}

/** Runtime guard for references that are ready for an authorized consumer. */
export function isHydratedPrivateAssetRef(
  value: unknown,
): value is HydratedPrivateAssetRef {
  if (!isPrivateAssetRef(value)) {
    return false
  }

  const url = (value as unknown as { url?: unknown }).url
  if (!isNonEmptyString(url)) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}
