import { useEffect, useState } from 'react'

import { useOrganizationStore } from '@/features/organizations/store/organizationStore'

export function useOrganizationHydrated() {
  const [hydrated, setHydrated] = useState(() =>
    useOrganizationStore.persist.hasHydrated(),
  )

  useEffect(() => {
    setHydrated(useOrganizationStore.persist.hasHydrated())

    return useOrganizationStore.persist.onFinishHydration(() => {
      setHydrated(true)
    })
  }, [])

  return hydrated
}
