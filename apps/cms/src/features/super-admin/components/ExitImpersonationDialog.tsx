import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { exitImpersonationSession } from '@/features/auth/lib/impersonation'
import { queryClient } from '@/providers/QueryProvider'

interface ExitImpersonationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ExitImpersonationDialog({ open, onOpenChange }: ExitImpersonationDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isPending, setIsPending] = useState(false)

  const handleConfirm = async () => {
    setIsPending(true)

    try {
      const restored = await exitImpersonationSession()

      if (!restored) {
        toast.error(t('superAdmin.impersonation.exitError'))
        return
      }

      await queryClient.invalidateQueries()
      toast.success(t('superAdmin.impersonation.exitSuccess'))
      onOpenChange(false)
      void navigate('/super-admin')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('superAdmin.impersonation.exitTitle')}</DialogTitle>
          <DialogDescription>{t('superAdmin.impersonation.exitDescription')}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button disabled={isPending} onClick={() => void handleConfirm()}>
            {t('superAdmin.impersonation.exitConfirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
