import 'server-only'

const API_URL =
  process.env.BACKEND_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1'

interface CrmLeadInput {
  type: 'contact' | 'quote'
  name: string
  email: string
  phone?: string
  company?: string
  message: string
  screenQuantity?: number
  city?: string
  country?: string
  locale?: string
}

export async function createCrmLead(formData: FormData, input: CrmLeadInput): Promise<void> {
  const field = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }
  const submissionId = field('submissionId')
  if (!submissionId) throw new Error('CRM submission id is missing')

  const response = await fetch(`${API_URL}/crm/leads`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      submissionId,
      ...input,
      anonymousId: field('anonymousId') || undefined,
      acquisitionToken: field('acquisitionToken') || undefined,
      website: field('website') || undefined,
    }),
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`CRM intake responded ${response.status.toString()}`)
  }
}
