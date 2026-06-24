import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { RecurringEditScope } from '@/features/schedules/types/schedule.types'

interface RecurringEditScopeDialogProps {
  open: boolean
  onSelect: (scope: RecurringEditScope) => void
  onCancel: () => void
}

const SCOPES: RecurringEditScope[] = ['this', 'following', 'all']

export function RecurringEditScopeDialog({
  open,
  onSelect,
  onCancel,
}: RecurringEditScopeDialogProps) {
  const { t } = useTranslation()

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel()
      }}
    >
      <DialogContent className="sm:max-w-sm" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('schedules.recurringEdit.title')}</DialogTitle>
          <DialogDescription>
            {t('schedules.recurringEdit.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          {SCOPES.map((scope) => (
            <Button
              key={scope}
              type="button"
              variant="outline"
              className="justify-start"
              onClick={() => {
                onSelect(scope)
              }}
            >
              {t(`schedules.recurringEdit.${scope}`)}
            </Button>
          ))}
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
