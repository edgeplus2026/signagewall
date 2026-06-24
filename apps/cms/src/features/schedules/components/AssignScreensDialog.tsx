import { useEffect, useMemo, useState } from 'react'
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
import { MultiSelect } from '@/components/ui/multi-select'
import { useScreens } from '@/features/screens/hooks/useScreens'

interface AssignScreensDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string[]
  onChange: (screenIds: string[]) => void
}

export function AssignScreensDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: AssignScreensDialogProps) {
  const { t } = useTranslation()
  const { data } = useScreens()
  const [selected, setSelected] = useState<string[]>(value)

  // Re-seed the selection each time the dialog opens.
  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelected(value)
  }, [open, value])

  const options = useMemo(
    () => (data ?? []).map((screen) => ({ label: screen.name, value: screen.id })),
    [data],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t('schedules.assignScreens.title')}</DialogTitle>
          <DialogDescription>
            {t('schedules.assignScreens.description')}
          </DialogDescription>
        </DialogHeader>

        <MultiSelect
          value={selected}
          options={options}
          onChange={setSelected}
          placeholder={t('schedules.assignScreens.placeholder')}
          searchPlaceholder={t('schedules.assignScreens.search')}
          emptyLabel={t('schedules.assignScreens.empty')}
        />

        <DialogFooter>
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
            type="button"
            onClick={() => {
              onChange(selected)
              onOpenChange(false)
            }}
          >
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
