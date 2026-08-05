import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { MailIcon, MessageSquareTextIcon, PhoneIcon } from 'lucide-react'
import { useDeferredValue, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { useCrmLeads, useCrmOverview, useUpdateCrmLead } from '@/features/crm/hooks/useCrmLeads'
import type {
  CrmAttributionTouch,
  CrmLead,
  CrmLeadEmailStatus,
  CrmLeadStatus,
  CrmLeadType,
} from '@/features/crm/types/crm.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type StatusFilter = CrmLeadStatus | 'all'
type TypeFilter = CrmLeadType | 'all'

const statuses: CrmLeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost', 'spam']

const statusStyles: Record<CrmLeadStatus, string> = {
  new: 'border-info/25 bg-info/10 text-info',
  contacted: 'border-brand/25 bg-brand/10 text-brand',
  qualified: 'border-warning/25 bg-warning/10 text-warning',
  won: 'border-success/25 bg-success/10 text-success',
  lost: 'border-danger/25 bg-danger/10 text-danger',
  spam: 'border-secondary bg-sidebar text-secondary',
}

const emailStatusStyles: Record<CrmLeadEmailStatus, string> = {
  pending: 'border-warning/25 bg-warning/10 text-warning',
  sent: 'border-success/25 bg-success/10 text-success',
  skipped: 'border-secondary bg-sidebar text-secondary',
  failed: 'border-danger/25 bg-danger/10 text-danger',
}

export function CrmTab() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [type, setType] = useState<TypeFilter>('all')
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null)
  const [editStatus, setEditStatus] = useState<CrmLeadStatus>('new')
  const [note, setNote] = useState('')
  const deferredSearch = useDeferredValue(search.trim())
  const overview = useCrmOverview()
  const leads = useCrmLeads({
    page,
    ...(status === 'all' ? {} : { status }),
    ...(type === 'all' ? {} : { type }),
    ...(deferredSearch ? { search: deferredSearch } : {}),
  })
  const updateLead = useUpdateCrmLead()

  const date = (value: string | null | undefined, includeTime = false): string =>
    value
      ? new Date(value).toLocaleString(
          i18n.language,
          includeTime
            ? { dateStyle: 'medium', timeStyle: 'short' }
            : { year: 'numeric', month: 'short', day: 'numeric' },
        )
      : '—'

  const openLead = (lead: CrmLead) => {
    setSelectedLead(lead)
    setEditStatus(lead.status)
    setNote('')
  }

  const statusLabel = (value: CrmLeadStatus) => t(`superAdmin.crm.status.${value}`)
  const typeLabel = (value: CrmLeadType) => t(`superAdmin.crm.type.${value}`)

  const columns: ColumnDef<CrmLead>[] = [
    {
      id: 'contact',
      meta: { width: '30%' },
      enableSorting: false,
      header: () => t('superAdmin.crm.columns.contact'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.name}</p>
          <p className="text-secondary truncate text-xs">{row.original.email}</p>
        </div>
      ),
    },
    {
      accessorKey: 'type',
      meta: { width: '12%' },
      enableSorting: false,
      header: () => t('superAdmin.crm.columns.type'),
      cell: ({ row }) => typeLabel(row.original.type),
    },
    {
      accessorKey: 'status',
      meta: { width: '16%' },
      enableSorting: false,
      header: () => t('superAdmin.crm.columns.status'),
      cell: ({ row }) => <StatusBadge status={row.original.status} label={statusLabel} />,
    },
    {
      id: 'source',
      meta: { width: '24%' },
      enableSorting: false,
      header: () => t('superAdmin.crm.columns.source'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate">{row.original.firstTouch?.source ?? 'direct'}</p>
          <p className="text-secondary truncate text-xs">
            {row.original.firstTouch?.campaign ?? row.original.firstTouch?.medium ?? '—'}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      meta: { width: '18%' },
      enableSorting: false,
      header: () => t('superAdmin.crm.columns.createdAt'),
      cell: ({ row }) => date(row.original.createdAt),
    },
  ]

  const saveLead = async () => {
    if (!selectedLead) return
    const trimmedNote = note.trim()
    const statusChanged = editStatus !== selectedLead.status
    if (!statusChanged && !trimmedNote) return

    try {
      const updated = await updateLead.mutateAsync({
        leadId: selectedLead.id,
        payload: {
          ...(statusChanged ? { status: editStatus } : {}),
          ...(trimmedNote ? { note: trimmedNote } : {}),
        },
      })
      setSelectedLead(updated)
      setEditStatus(updated.status)
      setNote('')
      toast.success(t('superAdmin.crm.updateSuccess'))
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.crm.updateError')))
    }
  }

  if (overview.isPending) {
    return <Skeleton className="h-96 w-full rounded-xl" />
  }

  if (overview.isError || leads.isError) {
    return <p className="text-danger text-sm">{t('superAdmin.crm.error')}</p>
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div>
        <h2 className="text-lg font-medium">{t('superAdmin.crm.title')}</h2>
        <p className="text-secondary text-sm">
          {t('superAdmin.crm.description', { count: overview.data.total })}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        {statuses.map((item) => (
          <Card key={item} className={statusStyles[item]}>
            <CardHeader>
              <CardTitle className="text-sm">{statusLabel(item)}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{overview.data.byStatus[item]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={leads.data?.items ?? []}
        searchPlaceholder={t('superAdmin.crm.search')}
        emptyMessage={t('superAdmin.crm.empty')}
        isLoading={leads.isFetching}
        onRowClick={openLead}
        serverSide={{
          search,
          onSearchChange: (value) => {
            setSearch(value)
            setPage(1)
          },
          sorting,
          onSortingChange: setSorting,
        }}
        toolbar={
          <div className="flex gap-2">
            <Select
              value={type}
              onValueChange={(value) => {
                setType(value as TypeFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superAdmin.crm.filters.allTypes')}</SelectItem>
                <SelectItem value="contact">{typeLabel('contact')}</SelectItem>
                <SelectItem value="quote">{typeLabel('quote')}</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as StatusFilter)
                setPage(1)
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('superAdmin.crm.filters.allStatuses')}</SelectItem>
                {statuses.map((item) => (
                  <SelectItem key={item} value={item}>
                    {statusLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        {...(leads.data
          ? {
              pagination: {
                page: leads.data.page,
                pageSize: leads.data.limit,
                total: leads.data.total,
                onPageChange: setPage,
              },
            }
          : {})}
      />

      <Dialog
        open={!!selectedLead}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selectedLead ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.name}</DialogTitle>
                <DialogDescription>
                  {typeLabel(selectedLead.type)} · {date(selectedLead.createdAt, true)}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailSection title={t('superAdmin.crm.details.contact')}>
                  <a
                    href={`mailto:${selectedLead.email}`}
                    className="hover:text-brand flex items-center gap-2"
                  >
                    <MailIcon className="size-4" />
                    {selectedLead.email}
                  </a>
                  {selectedLead.phone ? (
                    <a
                      href={`tel:${selectedLead.phone}`}
                      className="hover:text-brand flex items-center gap-2"
                    >
                      <PhoneIcon className="size-4" />
                      {selectedLead.phone}
                    </a>
                  ) : null}
                  <p>{selectedLead.company ?? '—'}</p>
                  <p>
                    {[selectedLead.city, selectedLead.country].filter(Boolean).join(', ') || '—'}
                  </p>
                  {selectedLead.screenQuantity !== undefined ? (
                    <p>
                      {t('superAdmin.crm.details.screens', {
                        count: selectedLead.screenQuantity,
                      })}
                    </p>
                  ) : null}
                </DetailSection>

                <DetailSection title={t('superAdmin.crm.details.attribution')}>
                  <AttributionTouch
                    title={t('superAdmin.crm.details.firstTouch')}
                    touch={selectedLead.firstTouch}
                  />
                  <AttributionTouch
                    title={t('superAdmin.crm.details.lastTouch')}
                    touch={selectedLead.lastTouch}
                  />
                </DetailSection>
              </div>

              <DetailSection title={t('superAdmin.crm.details.message')}>
                <p className="whitespace-pre-wrap">{selectedLead.message}</p>
              </DetailSection>

              <div className="grid gap-4 sm:grid-cols-2">
                <DetailSection title={t('superAdmin.crm.details.emailNotification')}>
                  <Badge
                    variant="outline"
                    className={emailStatusStyles[selectedLead.emailNotificationStatus]}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden />
                    {t(`superAdmin.crm.emailStatus.${selectedLead.emailNotificationStatus}`)}
                  </Badge>
                  <p className="text-secondary text-xs">
                    {date(selectedLead.emailNotificationAt, true)}
                  </p>
                </DetailSection>

                <DetailSection title={t('superAdmin.crm.details.history')}>
                  {[...selectedLead.statusHistory]
                    .reverse()
                    .slice(0, 5)
                    .map((entry, index) => (
                      <div
                        key={`${entry.occurredAt}-${index.toString()}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <StatusBadge status={entry.status} label={statusLabel} />
                        <time className="text-secondary text-xs">
                          {date(entry.occurredAt, true)}
                        </time>
                      </div>
                    ))}
                </DetailSection>
              </div>

              <DetailSection title={t('superAdmin.crm.details.notes')}>
                {selectedLead.internalNotes.length === 0 ? (
                  <p className="text-secondary">{t('superAdmin.crm.details.noNotes')}</p>
                ) : (
                  [...selectedLead.internalNotes].reverse().map((item, index) => (
                    <div
                      key={`${item.createdAt}-${index.toString()}`}
                      className="border-secondary border-b pb-2 last:border-0 last:pb-0"
                    >
                      <p className="whitespace-pre-wrap">{item.text}</p>
                      <time className="text-secondary text-xs">{date(item.createdAt, true)}</time>
                    </div>
                  ))
                )}
              </DetailSection>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel>{t('superAdmin.crm.edit.status')}</FieldLabel>
                  <Select
                    value={editStatus}
                    onValueChange={(value) => {
                      setEditStatus(value as CrmLeadStatus)
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((item) => (
                        <SelectItem key={item} value={item}>
                          {statusLabel(item)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel>{t('superAdmin.crm.edit.note')}</FieldLabel>
                  <Textarea
                    value={note}
                    onChange={(event) => {
                      setNote(event.target.value)
                    }}
                    maxLength={2000}
                    placeholder={t('superAdmin.crm.edit.notePlaceholder')}
                  />
                </Field>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  onClick={() => void saveLead()}
                  disabled={
                    updateLead.isPending || (editStatus === selectedLead.status && !note.trim())
                  }
                >
                  <MessageSquareTextIcon />
                  {t('superAdmin.crm.edit.save')}
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function StatusBadge({
  status,
  label,
}: {
  status: CrmLeadStatus
  label: (status: CrmLeadStatus) => string
}) {
  return (
    <Badge variant="outline" className={statusStyles[status]}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {label(status)}
    </Badge>
  )
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-secondary flex flex-col gap-2 rounded-lg border p-3">
      <h3 className="text-secondary text-xs font-medium tracking-wide uppercase">{title}</h3>
      {children}
    </section>
  )
}

function AttributionTouch({
  title,
  touch,
}: {
  title: string
  touch: CrmAttributionTouch | undefined
}) {
  return (
    <div>
      <p className="text-xs font-medium">{title}</p>
      <p className={cn('text-secondary text-xs', !touch && 'italic')}>
        {touch
          ? [touch.source ?? 'direct', touch.medium ?? 'none', touch.campaign]
              .filter(Boolean)
              .join(' / ')
          : '—'}
      </p>
      {touch?.landingPath ? (
        <p className="text-secondary truncate text-xs" title={touch.landingPath}>
          {touch.landingPath}
        </p>
      ) : null}
    </div>
  )
}
