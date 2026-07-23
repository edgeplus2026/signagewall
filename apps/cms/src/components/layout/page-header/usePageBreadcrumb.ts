import { useEffect, useRef } from 'react'

import { usePageHeader } from '@/components/layout/page-header/PageHeaderContext'
import { serializeBreadcrumbValue } from '@/components/layout/page-header/serializeBreadcrumb'
import type { PageBreadcrumbValue } from '@/components/layout/page-header/types'

export function usePageBreadcrumb(value: PageBreadcrumbValue | undefined) {
  const { setBreadcrumbOverride } = usePageHeader()
  const valueRef = useRef(value)
  const serializedValue = serializeBreadcrumbValue(value)

  // Keep the ref current in an effect, not during render — a render may be
  // discarded, and writing a ref then is what `react-hooks/refs` warns about.
  // Effects run in declaration order, so the publish effect below already sees
  // the latest value.
  useEffect(() => {
    valueRef.current = value
  })

  useEffect(() => {
    setBreadcrumbOverride(valueRef.current ?? null)

    return () => {
      setBreadcrumbOverride(null)
    }
  }, [serializedValue, setBreadcrumbOverride])
}
