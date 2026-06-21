import type {
  MediaItem,
  MediaListParams,
  MediaSortField,
} from '@/features/media/types/media.types'

export function filterMediaItems(
  items: MediaItem[],
  params: Pick<
    MediaListParams,
    'search' | 'typeFilter' | 'sortBy' | 'sortDirection'
  >,
): MediaItem[] {
  let result = [...items]

  if (params.typeFilter && params.typeFilter !== 'all') {
    result = result.filter((item) => item.type === params.typeFilter)
  }

  const search = params.search?.trim().toLowerCase()

  if (search) {
    result = result.filter((item) => item.name.toLowerCase().includes(search))
  }

  const sortBy = params.sortBy ?? 'name'
  const sortDirection = params.sortDirection ?? 'asc'
  const directionMultiplier = sortDirection === 'asc' ? 1 : -1

  result.sort((a, b) => {
    switch (sortBy as MediaSortField) {
      case 'createdAt':
        return (
          (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) *
          directionMultiplier
        )
      case 'type':
        return a.type.localeCompare(b.type) * directionMultiplier
      case 'size':
        return ((a.size ?? 0) - (b.size ?? 0)) * directionMultiplier
      case 'name':
      default:
        return a.name.localeCompare(b.name) * directionMultiplier
    }
  })

  return result
}
