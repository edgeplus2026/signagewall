import { ListVideoIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { usePageBreadcrumb } from '@/components/layout/page-header/usePageBreadcrumb'

interface PlaylistBreadcrumbProps {
  playlistName?: string | undefined
}

export function PlaylistBreadcrumb({ playlistName }: PlaylistBreadcrumbProps) {
  const { t } = useTranslation()

  const breadcrumb = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        kind: 'link',
        label: t('playlists.breadcrumb.root'),
        href: '/playlists',
        icon: ListVideoIcon,
      },
    ]

    if (playlistName) {
      items.push({
        kind: 'current',
        label: playlistName,
      })
    }

    return items
  }, [playlistName, t])

  usePageBreadcrumb(breadcrumb)

  return null
}
