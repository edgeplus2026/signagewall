import { authApi } from '@/features/auth/api/authApi'
import { getJwtPayload } from '@/features/auth/lib/jwt'
import { useAuthStore } from '@/features/auth/store/authStore'
import type { User } from '@/features/auth/types/auth.types'
import { syncOrganizationsQuery } from '@/features/organizations/lib/syncOrganizationsQuery'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import type { Organization } from '@/features/organizations/types/organization.types'
import { resetAuthRefreshState } from '@/lib/axios'

const BACKUP_KEY = 'impersonation-backup'

export interface ImpersonationBackup {
  user: User
  token: string
  refreshToken: string
  organizations: Organization[]
  activeOrganizationId: string | null
}

export function saveImpersonationBackup(backup: ImpersonationBackup): void {
  sessionStorage.setItem(BACKUP_KEY, JSON.stringify(backup))
}

export function loadImpersonationBackup(): ImpersonationBackup | null {
  const raw = sessionStorage.getItem(BACKUP_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as ImpersonationBackup
  } catch {
    return null
  }
}

export function clearImpersonationBackup(): void {
  sessionStorage.removeItem(BACKUP_KEY)
}

export function hasImpersonationBackup(): boolean {
  return loadImpersonationBackup() !== null
}

function restoreOrganizationsFromBackup(backup: ImpersonationBackup): void {
  const orgStore = useOrganizationStore.getState()
  orgStore.setOrganizations(backup.organizations)
  if (backup.activeOrganizationId) {
    orgStore.setActiveOrganization(backup.activeOrganizationId)
  }
}

export async function exitImpersonationSession(): Promise<boolean> {
  resetAuthRefreshState()

  const backup = loadImpersonationBackup()
  const authStore = useAuthStore.getState()

  try {
    const response = await authApi.exitImpersonation()
    authStore.setAuth(
      response.user,
      response.tokens.accessToken,
      response.tokens.refreshToken,
    )

    if (backup) {
      restoreOrganizationsFromBackup(backup)
    } else {
      useOrganizationStore.getState().reset()
      await syncOrganizationsQuery()
    }

    clearImpersonationBackup()
    authStore.setImpersonationActive(false)
    return true
  } catch {
    if (!backup) {
      return false
    }

    authStore.setAuth(backup.user, backup.token, backup.refreshToken)
    restoreOrganizationsFromBackup(backup)
    clearImpersonationBackup()
    authStore.setImpersonationActive(false)

    return !getJwtPayload(backup.token)?.impersonatorId
  }
}
