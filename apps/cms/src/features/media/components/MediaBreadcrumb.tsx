import { HomeIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import type { BreadcrumbItem } from '@/components/layout/page-header/types'
import { usePageBreadcrumb } from '@/components/layout/page-header/usePageBreadcrumb'
import type { MediaItem } from '@/features/media/types/media.types'

interface MediaBreadcrumbProps {
  path: MediaItem[]
  onNavigate: (folderId: string | null) => void
}

export function MediaBreadcrumb({ path, onNavigate }: MediaBreadcrumbProps) {
  const { t } = useTranslation()

  const breadcrumb = useMemo((): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        kind: 'action',
        label: t('media.breadcrumb.root'),
        icon: HomeIcon,
        onClick: () => {
          onNavigate(null)
        },
      },
      ...path.map((folder) => ({
        kind: 'action' as const,
        label: folder.name,
        onClick: () => {
          onNavigate(folder.id)
        },
      })),
    ]

    return items
  }, [onNavigate, path, t])

  usePageBreadcrumb(breadcrumb)

  return null
}
