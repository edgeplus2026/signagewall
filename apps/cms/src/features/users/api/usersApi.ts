import type {
  InviteUserRequest,
  UpdateUserRequest,
  User,
} from '@/features/users/types/user.types'
import { api } from '@/lib/axios'

const MEMBERS_BASE = '/members'

export const usersApi = {
  list: async (): Promise<User[]> => {
    const { data } = await api.get<User[]>(MEMBERS_BASE)
    return data
  },

  invite: async (payload: InviteUserRequest): Promise<User> => {
    const { data } = await api.post<User>(`${MEMBERS_BASE}/invite`, payload)
    return data
  },

  update: async (id: string, payload: UpdateUserRequest): Promise<User> => {
    const { data } = await api.patch<User>(`${MEMBERS_BASE}/${id}`, payload)
    return data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`${MEMBERS_BASE}/${id}`)
  },
}

export { MEMBERS_BASE as USERS_BASE }
