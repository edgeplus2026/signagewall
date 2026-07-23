import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import type { PageBreadcrumbValue } from '@/components/layout/page-header/types'

interface PageHeaderContextValue {
  breadcrumbOverride: PageBreadcrumbValue
  setBreadcrumbOverride: (value: PageBreadcrumbValue) => void
}

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null)

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [breadcrumbOverride, setBreadcrumbOverride] =
    useState<PageBreadcrumbValue>(null)

  const value = useMemo(
    () => ({ breadcrumbOverride, setBreadcrumbOverride }),
    [breadcrumbOverride],
  )

  return (
    <PageHeaderContext.Provider value={value}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)

  if (!context) {
    throw new Error('usePageHeader must be used within PageHeaderProvider')
  }

  return context
}
