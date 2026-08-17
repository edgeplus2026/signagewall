export const USER_ROLES = ["admin", "member", "viewer"] as const

export type UserRole = (typeof USER_ROLES)[number]

export const USER_STATUSES = ["approved", "pending"] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  status: UserStatus
  createdAt: string
}

export interface InviteUserRequest {
  name: string
  email: string
  role: UserRole
}

export interface UpdateUserRequest {
  name: string
  role: UserRole
}
