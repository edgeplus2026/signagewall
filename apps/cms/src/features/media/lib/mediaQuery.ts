import type { MediaListParams } from '@/features/media/types/media.types'

export function buildMediaListQuery(
  params: Pick<MediaListParams, 'parentId'> & {
    foldersOnly?: boolean
    all?: boolean
  },
): Record<string, string> {
  const query: Record<string, string> = {}

  if (params.parentId) {
    query.parentId = params.parentId
  }

  if (params.foldersOnly) {
    query.foldersOnly = 'true'
  }

  if (params.all) {
    query.all = 'true'
  }

  return query
}
