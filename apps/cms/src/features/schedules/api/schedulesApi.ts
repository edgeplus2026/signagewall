import type {
  AssignScreensRequest,
  CreateScheduleRequest,
  ScheduleDetail,
  ScheduleEvent,
  ScheduleSummary,
  ReplaceScheduleEventsRequest,
  UpdateScheduleRequest,
} from '@/features/schedules/types/schedule.types'
import type { ScreenSummary } from '@/features/screens/types/screen.types'
import { ApiError } from '@/lib/api-error'
import { api } from '@/lib/axios'

const SCHEDULES_BASE = '/schedules'

export const schedulesApi = {
  list: async (): Promise<ScheduleSummary[]> => {
    const { data } = await api.get<ScheduleSummary[]>(SCHEDULES_BASE)
    return data
  },

  get: async (id: string): Promise<ScheduleDetail | null> => {
    try {
      const { data } = await api.get<ScheduleDetail>(`${SCHEDULES_BASE}/${id}`)
      return data
    } catch (error) {
      if (error instanceof ApiError && error.code === 'NOT_FOUND') {
        return null
      }
      throw error
    }
  },

  getEvents: async (id: string): Promise<ScheduleEvent[]> => {
    const { data } = await api.get<ScheduleEvent[]>(
      `${SCHEDULES_BASE}/${id}/events`,
    )
    return data
  },

  getScreens: async (id: string): Promise<ScreenSummary[]> => {
    const { data } = await api.get<ScreenSummary[]>(
      `${SCHEDULES_BASE}/${id}/screens`,
    )
    return data
  },

  create: async (payload: CreateScheduleRequest): Promise<ScheduleDetail> => {
    const { data } = await api.post<ScheduleDetail>(SCHEDULES_BASE, payload)
    return data
  },

  update: async (
    id: string,
    payload: UpdateScheduleRequest,
  ): Promise<ScheduleDetail> => {
    const { data } = await api.patch<ScheduleDetail>(
      `${SCHEDULES_BASE}/${id}`,
      payload,
    )
    return data
  },

  delete: async (ids: string[]): Promise<void> => {
    await api.post(`${SCHEDULES_BASE}/delete`, { ids })
  },

  replaceEvents: async (
    id: string,
    payload: ReplaceScheduleEventsRequest,
  ): Promise<ScheduleEvent[]> => {
    const { data } = await api.put<ScheduleEvent[]>(
      `${SCHEDULES_BASE}/${id}/events`,
      payload,
    )
    return data
  },

  assignScreens: async (
    id: string,
    payload: AssignScreensRequest,
  ): Promise<ScheduleSummary> => {
    const { data } = await api.put<ScheduleSummary>(
      `${SCHEDULES_BASE}/${id}/screens`,
      payload,
    )
    return data
  },
}

export { SCHEDULES_BASE }
