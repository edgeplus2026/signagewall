import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { Organization } from '@/features/organizations/types/organization.types'

interface OrganizationState {
  organizations: Organization[]
  activeOrganizationId: string | null
  setOrganizations: (organizations: Organization[]) => void
  setActiveOrganization: (id: string) => void
  upsertOrganization: (organization: Organization) => void
  removeOrganization: (id: string) => void
  reset: () => void
}

const initialState = {
  organizations: [] as Organization[],
  activeOrganizationId: null as string | null,
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set) => ({
      ...initialState,

      setOrganizations: (organizations) => {
        set((state) => {
          const activeStillValid = organizations.some(
            (organization) => organization.id === state.activeOrganizationId,
          )

          return {
            organizations,
            activeOrganizationId: activeStillValid
              ? state.activeOrganizationId
              : (organizations[0]?.id ?? null),
          }
        })
      },

      setActiveOrganization: (id) => {
        set({ activeOrganizationId: id })
      },

      upsertOrganization: (organization) => {
        set((state) => {
          const exists = state.organizations.some((item) => item.id === organization.id)
          const organizations = exists
            ? state.organizations.map((item) =>
                item.id === organization.id ? organization : item,
              )
            : [...state.organizations, organization]

          return {
            organizations,
            activeOrganizationId: state.activeOrganizationId ?? organization.id,
          }
        })
      },

      removeOrganization: (id) => {
        set((state) => {
          const organizations = state.organizations.filter(
            (organization) => organization.id !== id,
          )
          const activeOrganizationId =
            state.activeOrganizationId === id
              ? (organizations[0]?.id ?? null)
              : state.activeOrganizationId

          return { organizations, activeOrganizationId }
        })
      },

      reset: () => {
        set(initialState)
      },
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        organizations: state.organizations,
        activeOrganizationId: state.activeOrganizationId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && !state.activeOrganizationId && state.organizations.length > 0) {
          state.activeOrganizationId = state.organizations[0]?.id ?? null
        }
      },
    },
  ),
)

export function useActiveOrganization() {
  const organizations = useOrganizationStore((state) => state.organizations)
  const activeOrganizationId = useOrganizationStore((state) => state.activeOrganizationId)
  return organizations.find((org) => org.id === activeOrganizationId) ?? organizations[0] ?? null
}
