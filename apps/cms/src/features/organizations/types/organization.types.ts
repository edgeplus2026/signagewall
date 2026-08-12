export type OrganizationRole = 'admin' | 'member' | 'viewer'

export interface Organization {
  id: string
  name: string
  role: OrganizationRole
}

export interface CreateOrganizationRequest {
  name: string
}

export interface UpdateOrganizationRequest {
  name: string
}
