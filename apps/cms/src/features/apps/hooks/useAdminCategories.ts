import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  categoriesApi,
  type CreateCategoryPayload,
  type UpdateCategoryPayload,
} from '@/features/apps/api/categoriesApi'
import {
  ADMIN_APPS_QUERY_KEY,
  ADMIN_CATEGORIES_QUERY_KEY,
  APP_CATEGORIES_QUERY_KEY,
} from '@/features/apps/lib/appsQueryKeys'

export function useAdminCategories() {
  return useQuery({
    queryKey: ADMIN_CATEGORIES_QUERY_KEY,
    queryFn: categoriesApi.listAll,
  })
}

function useCategoriesInvalidation() {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_CATEGORIES_QUERY_KEY })
    void queryClient.invalidateQueries({ queryKey: APP_CATEGORIES_QUERY_KEY })
    // Deleting a category drops it from apps, so the catalog must refetch too.
    void queryClient.invalidateQueries({ queryKey: ADMIN_APPS_QUERY_KEY })
  }
}

export function useCreateCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: (payload: CreateCategoryPayload) => categoriesApi.create(payload),
    onSuccess: invalidate,
  })
}

export function useUpdateCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryPayload }) =>
      categoriesApi.update(id, payload),
    onSuccess: invalidate,
  })
}

export function useDeleteCategory() {
  const invalidate = useCategoriesInvalidation()
  return useMutation({
    mutationFn: (id: string) => categoriesApi.delete(id),
    onSuccess: invalidate,
  })
}
