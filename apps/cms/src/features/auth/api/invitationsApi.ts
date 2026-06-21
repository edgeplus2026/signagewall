import { api } from '@/lib/axios'

export interface InvitationPreview {
  email: string
  organizationName: string
  organizationId: string
  role: 'admin' | 'member'
  accountExists: boolean
}

export interface AcceptInvitationResponse {
  organizationId: string
}

export const invitationsApi = {
  getPreview: async (token: string): Promise<InvitationPreview> => {
    const { data } = await api.get<InvitationPreview>(`/invitations/${token}`)
    return data
  },

  accept: async (token: string): Promise<AcceptInvitationResponse> => {
    const { data } = await api.post<AcceptInvitationResponse>(
      `/invitations/${token}/accept`,
    )
    return data
  },

  decline: async (token: string): Promise<void> => {
    await api.post(`/invitations/${token}/decline`)
  },
}
