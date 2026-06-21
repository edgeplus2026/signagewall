import type { Organization } from '@/features/organizations/types/organization.types'

export interface AdminUserListItem {
  id: string
  name: string
  email: string
  provider: string
  isActive: boolean
  isSuperAdmin: boolean
  organizationCount: number
  createdAt: string
}

export interface PaginatedAdminUsers {
  items: AdminUserListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface AdminUserDetail {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  provider: string
  isActive: boolean
  isSuperAdmin: boolean
  hasPassword: boolean
  createdAt: string
  updatedAt: string
  organizations: Organization[]
}
