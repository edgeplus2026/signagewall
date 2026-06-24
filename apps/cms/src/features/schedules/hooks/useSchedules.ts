import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { schedulesApi } from '@/features/schedules/api/schedulesApi'
import {
  scheduleDetailQueryKey,
  scheduleScreensQueryKey,
  schedulesQueryKey,
} from '@/features/schedules/lib/scheduleQueryKeys'
import type {
  AssignScreensRequest,
  CreateScheduleRequest,
  ReplaceScheduleEventsRequest,
  Schedule,
  UpdateScheduleRequest,
} from '@/features/schedules/types/schedule.types'
import { screensQueryKey } from '@/features/screens/lib/screenQueryKeys'
import { ApiError } from '@/lib/api-error'

function useActiveOrganizationId() {
  return useOrganizationStore((state) => state.activeOrganizationId)
}

function invalidateSchedules(
  queryClient: ReturnType<typeof useQueryClient>,
  organizationId: string | null | undefined,
  scheduleId?: string,
) {
  void queryClient.invalidateQueries({
    queryKey: schedulesQueryKey(organizationId),
    exact: true,
  })
  if (scheduleId) {
    void queryClient.invalidateQueries({
      queryKey: scheduleDetailQueryKey(organizationId, scheduleId),
    })
  }
}

export function useSchedules() {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: schedulesQueryKey(organizationId),
    queryFn: schedulesApi.list,
    enabled: Boolean(organizationId),
  })
}

export function useSchedule(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: scheduleDetailQueryKey(organizationId, id ?? ''),
    queryFn: async (): Promise<Schedule | null> => {
      if (!id) return null

      const [detail, events] = await Promise.all([
        schedulesApi.get(id),
        schedulesApi.getEvents(id).catch((error: unknown) => {
          if (error instanceof ApiError && error.code === 'NOT_FOUND') {
            return []
          }
          throw error
        }),
      ])
      if (!detail) return null

      return { ...detail, events }
    },
    enabled: Boolean(organizationId && id),
  })
}

export function useScheduleScreens(id: string | null) {
  const organizationId = useActiveOrganizationId()

  return useQuery({
    queryKey: scheduleScreensQueryKey(organizationId, id ?? ''),
    queryFn: () => (id ? schedulesApi.getScreens(id) : []),
    enabled: Boolean(organizationId && id),
    staleTime: 0,
  })
}

export function useCreateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: CreateScheduleRequest) => schedulesApi.create(payload),
    onSuccess: () => {
      invalidateSchedules(
        queryClient,
        useOrganizationStore.getState().activeOrganizationId,
      )
    },
  })
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateScheduleRequest }) =>
      schedulesApi.update(id, payload),
    onSuccess: (data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      queryClient.setQueryData<Schedule | null>(
        scheduleDetailQueryKey(organizationId, variables.id),
        (current) => (current ? { ...current, ...data } : current),
      )
      invalidateSchedules(queryClient, organizationId, variables.id)
    },
  })
}

export function useDeleteSchedules() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (ids: string[]) => schedulesApi.delete(ids),
    onSuccess: (_data, ids) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      invalidateSchedules(queryClient, organizationId)
      // Deleting a schedule clears `scheduleId` on its screens.
      void queryClient.invalidateQueries({
        queryKey: screensQueryKey(organizationId),
        exact: true,
      })
      ids.forEach((id) => {
        queryClient.removeQueries({
          queryKey: scheduleDetailQueryKey(organizationId, id),
        })
      })
    },
  })
}

export function useReplaceScheduleEvents() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string
      payload: ReplaceScheduleEventsRequest
    }) => schedulesApi.replaceEvents(id, payload),
    onSuccess: (events, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      // Seed the detail cache with the canonical events the server returned.
      queryClient.setQueryData<Schedule | null>(
        scheduleDetailQueryKey(organizationId, variables.id),
        (current) =>
          current ? { ...current, events, eventCount: events.length } : current,
      )
      void queryClient.invalidateQueries({
        queryKey: schedulesQueryKey(organizationId),
        exact: true,
      })
    },
    onError: (error, variables) => {
      // On a concurrent-edit conflict, reload the detail so the editor resyncs.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        const organizationId =
          useOrganizationStore.getState().activeOrganizationId
        void queryClient.invalidateQueries({
          queryKey: scheduleDetailQueryKey(organizationId, variables.id),
        })
      }
    },
  })
}

export function useAssignScheduleScreens() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: AssignScreensRequest }) =>
      schedulesApi.assignScreens(id, payload),
    onSuccess: (_data, variables) => {
      const organizationId = useOrganizationStore.getState().activeOrganizationId
      invalidateSchedules(queryClient, organizationId, variables.id)
      void queryClient.invalidateQueries({
        queryKey: scheduleScreensQueryKey(organizationId, variables.id),
      })
      // Screens may have moved between schedules (scheduleId changed).
      void queryClient.invalidateQueries({
        queryKey: schedulesQueryKey(organizationId),
        exact: true,
      })
    },
  })
}
