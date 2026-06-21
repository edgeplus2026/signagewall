import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { ExitImpersonationDialog } from '@/features/super-admin/components/ExitImpersonationDialog'
import { useAuthStore } from '@/features/auth/store/authStore'

export function ImpersonationBanner() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const impersonationActive = useAuthStore((state) => state.impersonationActive)
  const [exitDialogOpen, setExitDialogOpen] = useState(false)

  if (!impersonationActive || !user) {
    return null
  }

  return (
    <>
      <div className="bg-warning/10 text-warning border-warning/20 flex items-center justify-between gap-3 border-b px-4 py-2 text-sm">
        <span>{t('superAdmin.impersonation.banner', { name: user.name, email: user.email })}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setExitDialogOpen(true)
          }}
        >
          {t('superAdmin.impersonation.exit')}
        </Button>
      </div>

      <ExitImpersonationDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen} />
    </>
  )
}
