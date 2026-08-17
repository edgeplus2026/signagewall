import { PencilIcon } from 'lucide-react'
import { useState } from 'react'
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
import { RepeaterControl } from '@/features/apps/config-form/RepeaterControl'
import type { FieldControlProps } from '@/features/apps/config-form/controls'

/**
 * A `repeater` marked `editor: 'dialog'` — a one-line summary plus an Edit
 * button that opens the real row editor in a wide modal.
 *
 * The config sidebar is ~384px. A menu row is five columns (name, price,
 * description, category, photo), so inline it gives every column ~60px and the
 * operator types a menu into slots too narrow to read. The modal is ~900px,
 * which is the width the row editor was designed for.
 *
 * The dialog wraps {@link RepeaterControl} unchanged rather than reimplementing
 * it, so drag-reorder, per-row controls and CSV import all keep working. Edits
 * apply live through the same `onChange` — the modal is a viewport onto the
 * field, not a staged form, so there is nothing to cancel and no draft to lose.
 */
export function DialogRepeaterControl(props: FieldControlProps) {
  const { field, id, value, disabled } = props
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const count = Array.isArray(value) ? value.length : 0

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="flex-1 text-sm text-secondary">
          {count === 0 ? t('apps.itemsEditor.empty') : t('apps.itemsEditor.count', { count })}
        </span>
        <Button
          id={id}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled ?? false}
          onClick={() => {
            setOpen(true)
          }}
        >
          <PencilIcon />
          {t('apps.itemsEditor.edit')}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-4xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{field.label}</DialogTitle>
            {field.help ? <DialogDescription>{field.help}</DialogDescription> : null}
          </DialogHeader>

          {/* `DialogContent` is a grid with no scroll of its own, so the rows
              scroll here and the header/footer stay put on a long menu. */}
          <div className="-mx-1 max-h-[65vh] overflow-y-auto px-1">
            <RepeaterControl {...props} />
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setOpen(false)
              }}
            >
              {t('apps.itemsEditor.done')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
