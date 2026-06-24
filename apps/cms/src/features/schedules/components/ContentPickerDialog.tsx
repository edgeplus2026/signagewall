import { CheckIcon, SearchIcon } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { FittingOptions } from '@/features/schedules/components/FittingOptions'
import type { ScheduleFit } from '@/features/schedules/types/schedule.types'
import { cn } from '@/lib/utils'

export interface PickItem {
  id: string
  name: string
}

interface ContentPickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  items: PickItem[]
  isLoading: boolean
  initialId?: string | undefined
  initialFit: ScheduleFit
  onConfirm: (result: { id: string; name: string; fit: ScheduleFit }) => void
}

export function ContentPickerDialog({
  open,
  onOpenChange,
  title,
  items,
  isLoading,
  initialId,
  initialFit,
  onConfirm,
}: ContentPickerDialogProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string | undefined>(initialId)
  const [fit, setFit] = useState<ScheduleFit>(initialFit)

  // Re-seed the selection each time the picker opens.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (open) {
      setSelectedId(initialId)
      setFit(initialFit)
      setQuery('')
    }
  }, [open, initialId, initialFit])
  /* eslint-enable react-hooks/set-state-in-effect */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => item.name.toLowerCase().includes(q))
  }, [items, query])

  const confirm = () => {
    const selected = items.find((item) => item.id === selectedId)
    if (!selected) return
    onConfirm({ id: selected.id, name: selected.name, fit })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="border-secondary flex items-center gap-2 rounded-lg border px-2.5">
          <SearchIcon className="text-secondary size-4 shrink-0" />
          <input
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value)
            }}
            placeholder={t('schedules.picker.search')}
            className="text-primary placeholder:text-secondary h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <div className="max-h-64 overflow-y-auto rounded-lg border border-secondary">
          {isLoading ? (
            <div className="flex flex-col gap-2 p-2">
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-secondary px-3 py-6 text-center text-sm">
              {t('schedules.picker.empty')}
            </p>
          ) : (
            <div className="flex flex-col p-1">
              {filtered.map((item) => {
                const selected = item.id === selectedId
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      setSelectedId(item.id)
                    }}
                    className={cn(
                      'flex items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors',
                      selected ? 'bg-highlight text-primary' : 'hover:bg-highlight/60',
                    )}
                  >
                    <span className="truncate">{item.name}</span>
                    {selected && <CheckIcon className="text-brand size-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-primary">
            {t('schedules.event.fitting')}
          </span>
          <FittingOptions value={fit} onChange={setFit} />
        </div>

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
          <Button type="button" disabled={!selectedId} onClick={confirm}>
            {t('common.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
