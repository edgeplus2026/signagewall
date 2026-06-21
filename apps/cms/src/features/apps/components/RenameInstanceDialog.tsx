import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRenameInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

interface RenameInstanceDialogProps {
  instance: AppInstance | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameInstanceDialog({
  instance,
  open,
  onOpenChange,
}: RenameInstanceDialogProps) {
  const { t } = useTranslation()
  const renameInstance = useRenameInstance()
  const [name, setName] = useState(instance?.name ?? '')

  // Reset the field whenever a different instance is opened — adjusting state
  // during render (React's recommended alternative to an effect).
  const [lastKey, setLastKey] = useState<string | null>(null)
  const currentKey = open && instance ? instance.id : null
  if (currentKey !== lastKey) {
    setLastKey(currentKey)
    setName(instance?.name ?? '')
  }

  const handleSubmit = () => {
    const trimmed = name.trim()
    if (!instance || trimmed.length === 0) return
    renameInstance.mutate(
      { id: instance.id, name: trimmed },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, t('apps.instances.rename.error')))
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('apps.instances.rename.title')}</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="instance-name">{t('apps.instances.rename.label')}</Label>
          <Input
            id="instance-name"
            value={name}
            autoFocus
            onChange={(event) => {
              setName(event.target.value)
            }}
            placeholder={t('apps.instances.rename.placeholder')}
          />
          <DialogFooter className="mt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={name.trim().length === 0 || renameInstance.isPending}
            >
              {t('apps.instances.rename.confirm')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
