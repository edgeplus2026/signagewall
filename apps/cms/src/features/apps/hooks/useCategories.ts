import { useQuery } from '@tanstack/react-query'

import { categoriesApi } from '@/features/apps/api/categoriesApi'
import { APP_CATEGORIES_QUERY_KEY } from '@/features/apps/lib/appsQueryKeys'

/** Org-facing categories, for the catalog filter. */
export function useCategories() {
  return useQuery({
    queryKey: APP_CATEGORIES_QUERY_KEY,
    queryFn: categoriesApi.list,
  })
}
