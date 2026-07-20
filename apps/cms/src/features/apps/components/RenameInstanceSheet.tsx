import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useRenameInstance } from '@/features/apps/hooks/useApps'
import type { AppInstance } from '@/features/apps/types/app.types'
import { getApiErrorMessage } from '@/lib/api-error'

const RENAME_FORM_ID = 'rename-instance-form'

interface RenameInstanceSheetProps {
  instance: AppInstance | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RenameInstanceSheet({
  instance,
  open,
  onOpenChange,
}: RenameInstanceSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md" showCloseButton={false}>
        <SheetHeader>
          <SheetTitle>{t('apps.instances.rename.title')}</SheetTitle>
          <SheetDescription>{t('apps.instances.rename.description')}</SheetDescription>
        </SheetHeader>

        <form
          id={RENAME_FORM_ID}
          className="flex flex-1 flex-col overflow-y-auto px-4"
          onSubmit={(event) => {
            event.preventDefault()
            handleSubmit()
          }}
        >
          <Field>
            <FieldLabel htmlFor="instance-name">
              {t('apps.instances.rename.label')}
            </FieldLabel>
            <Input
              id="instance-name"
              value={name}
              autoFocus
              autoComplete="off"
              onChange={(event) => {
                setName(event.target.value)
              }}
              placeholder={t('apps.instances.rename.placeholder')}
            />
          </Field>
        </form>

        <SheetFooter className="flex-row justify-end gap-2 border-t border-secondary">
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
            form={RENAME_FORM_ID}
            disabled={name.trim().length === 0 || renameInstance.isPending}
          >
            {t('apps.instances.rename.confirm')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
