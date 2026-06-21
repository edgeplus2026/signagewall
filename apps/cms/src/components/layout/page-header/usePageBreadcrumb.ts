import { useEffect, useRef } from 'react'

import { usePageHeader } from '@/components/layout/page-header/PageHeaderContext'
import { serializeBreadcrumbValue } from '@/components/layout/page-header/serializeBreadcrumb'
import type { PageBreadcrumbValue } from '@/components/layout/page-header/types'

export function usePageBreadcrumb(value: PageBreadcrumbValue | undefined) {
  const { setBreadcrumbOverride } = usePageHeader()
  const valueRef = useRef(value)
  valueRef.current = value
  const serializedValue = serializeBreadcrumbValue(value)

  useEffect(() => {
    setBreadcrumbOverride(valueRef.current ?? null)

    return () => {
      setBreadcrumbOverride(null)
    }
  }, [serializedValue, setBreadcrumbOverride])
}
