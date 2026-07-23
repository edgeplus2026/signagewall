export interface JwtPayload {
  sub?: string
  email?: string
  impersonatorId?: string
}

export function getJwtPayload(token: string): JwtPayload | null {
  const [, payload] = token.split('.')
  if (!payload) return null

  try {
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    return JSON.parse(atob(padded)) as JwtPayload
  } catch {
    return null
  }
}

export function tokenHasImpersonator(token: string | null): boolean {
  if (!token) return false
  return Boolean(getJwtPayload(token)?.impersonatorId)
}
