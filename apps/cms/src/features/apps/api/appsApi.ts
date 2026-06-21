import type {
  AdminApp,
  AppInstance,
  AppInstanceConfig,
  EdgeApp,
} from '@/features/apps/types/app.types'
import { ApiError } from '@/lib/api-error'
import { api } from '@/lib/axios'

const APPS_BASE = '/apps'
const INSTANCES_BASE = '/app-instances'
const ADMIN_BASE = '/admin/apps'

async function getOrNull<T>(url: string): Promise<T | null> {
  try {
    const { data } = await api.get<T>(url)
    return data
  } catch (error) {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      return null
    }
    throw error
  }
}

export interface CreateAppPayload {
  slug: string
  name: string
  tagline: string
  description: string
  about?: string | undefined
  iconSvg?: string | undefined
  color?: string | undefined
  isPublic?: boolean | undefined
}

export type UpdateAppPayload = Partial<Omit<CreateAppPayload, 'slug'>>

export interface AvailableManifest {
  slug: string
  name: string
  tagline: string
  description: string
  alreadyInCatalog: boolean
}

export const appsApi = {
  // ----- Organization catalog -----

  listCatalog: async (): Promise<EdgeApp[]> => {
    const { data } = await api.get<EdgeApp[]>(APPS_BASE)
    return data
  },

  getApp: async (id: string): Promise<EdgeApp | null> => {
    return getOrNull<EdgeApp>(`${APPS_BASE}/${id}`)
  },

  install: async (id: string): Promise<EdgeApp> => {
    const { data } = await api.post<EdgeApp>(`${APPS_BASE}/${id}/install`)
    return data
  },

  uninstall: async (id: string): Promise<void> => {
    await api.delete(`${APPS_BASE}/${id}/install`)
  },

  // ----- Instances -----

  listInstances: async (appId?: string): Promise<AppInstance[]> => {
    const { data } = await api.get<AppInstance[]>(INSTANCES_BASE, {
      params: appId ? { appId } : undefined,
    })
    return data
  },

  getInstance: async (id: string): Promise<AppInstance | null> => {
    return getOrNull<AppInstance>(`${INSTANCES_BASE}/${id}`)
  },

  createInstance: async (appId: string, name?: string): Promise<AppInstance> => {
    const { data } = await api.post<AppInstance>(INSTANCES_BASE, {
      appId,
      ...(name ? { name } : {}),
    })
    return data
  },

  renameInstance: async (id: string, name: string): Promise<AppInstance> => {
    const { data } = await api.patch<AppInstance>(`${INSTANCES_BASE}/${id}`, { name })
    return data
  },

  updateInstanceConfig: async (
    id: string,
    config: AppInstanceConfig,
  ): Promise<AppInstance> => {
    const { data } = await api.put<AppInstance>(`${INSTANCES_BASE}/${id}/config`, {
      config,
    })
    return data
  },

  duplicateInstance: async (id: string): Promise<AppInstance> => {
    const { data } = await api.post<AppInstance>(`${INSTANCES_BASE}/${id}/duplicate`)
    return data
  },

  deleteInstance: async (id: string): Promise<void> => {
    await api.delete(`${INSTANCES_BASE}/${id}`)
  },

  // ----- Super-admin catalog management -----

  listAll: async (): Promise<AdminApp[]> => {
    const { data } = await api.get<AdminApp[]>(ADMIN_BASE)
    return data
  },

  listManifests: async (): Promise<AvailableManifest[]> => {
    const { data } = await api.get<AvailableManifest[]>(`${ADMIN_BASE}/manifests`)
    return data
  },

  getAdminApp: async (id: string): Promise<AdminApp | null> => {
    return getOrNull<AdminApp>(`${ADMIN_BASE}/${id}`)
  },

  createApp: async (payload: CreateAppPayload): Promise<AdminApp> => {
    const { data } = await api.post<AdminApp>(ADMIN_BASE, payload)
    return data
  },

  updateApp: async (id: string, payload: UpdateAppPayload): Promise<AdminApp> => {
    const { data } = await api.patch<AdminApp>(`${ADMIN_BASE}/${id}`, payload)
    return data
  },

  setVisibility: async (id: string, isPublic: boolean): Promise<AdminApp> => {
    const { data } = await api.patch<AdminApp>(`${ADMIN_BASE}/${id}/visibility`, {
      isPublic,
    })
    return data
  },

  deleteApp: async (id: string): Promise<void> => {
    await api.delete(`${ADMIN_BASE}/${id}`)
  },
}
