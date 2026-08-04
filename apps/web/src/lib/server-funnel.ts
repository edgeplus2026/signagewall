import 'server-only'

const API_URL =
  process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

export async function recordLead(
  formData: FormData,
  leadType: 'contact' | 'quote',
  properties: Record<string, string | number | boolean> = {},
): Promise<void> {
  const field = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value : ''
  }
  const anonymousId = field('anonymousId')
  if (!anonymousId) return

  await fetch(`${API_URL}/analytics/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      eventName: 'generate_lead',
      anonymousId,
      acquisitionToken: field('acquisitionToken') || undefined,
      analyticsConsent: field('analyticsConsent') === 'true',
      leadType,
      properties: { form: leadType, ...properties },
    }),
    cache: 'no-store',
  }).catch((error: unknown) => {
    console.warn(`[analytics] Could not record ${leadType} lead`, error)
  })
}
