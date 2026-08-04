import type { ColumnDef } from '@tanstack/react-table'
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleDollarSignIcon,
  EllipsisIcon,
  FilePenLineIcon,
  FileTextIcon,
  PlusIcon,
  SendIcon,
  Trash2Icon,
  XCircleIcon,
} from 'lucide-react'
import { useState } from 'react'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { BillingInvoiceDialog } from '@/features/billing/components/BillingInvoiceDialog'
import {
  useArchiveInvoice,
  useBillingExceptions,
  useBillingOverview,
  useManualInvoices,
  useMarkInvoicePaid,
  useMarkInvoiceSent,
  useVoidInvoice,
} from '@/features/billing/hooks/useAdminBilling'
import type {
  BillingException,
  ManualInvoice,
  ManualInvoiceStatus,
} from '@/features/billing/types/billing.types'
import { getApiErrorMessage } from '@/lib/api-error'
import { cn } from '@/lib/utils'

type StatusFilter = ManualInvoiceStatus | 'all'

const statusStyles: Record<ManualInvoiceStatus, string> = {
  draft: 'border-warning/25 bg-warning/10 text-warning',
  sent: 'border-info/25 bg-info/10 text-info',
  paid: 'border-success/25 bg-success/10 text-success',
  overdue: 'border-danger/25 bg-danger/10 text-danger',
  void: 'border-secondary bg-sidebar text-secondary',
}

export function BillingTab() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<StatusFilter>('all')
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [editInvoice, setEditInvoice] = useState<ManualInvoice | null>(null)
  const [sendInvoice, setSendInvoice] = useState<ManualInvoice | null>(null)
  const [paidInvoice, setPaidInvoice] = useState<ManualInvoice | null>(null)
  const [voidingInvoice, setVoidingInvoice] = useState<ManualInvoice | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<ManualInvoice | null>(null)
  const [paymentReference, setPaymentReference] = useState('')
  const [voidReason, setVoidReason] = useState('')

  const overview = useBillingOverview()
  const exceptions = useBillingExceptions()
  const invoices = useManualInvoices({
    page,
    limit: 20,
    ...(status === 'all' ? {} : { status }),
  })
  const markSent = useMarkInvoiceSent()
  const markPaid = useMarkInvoicePaid()
  const voidInvoice = useVoidInvoice()
  const archiveInvoice = useArchiveInvoice()

  const date = (value: string | null | undefined): string =>
    value
      ? new Date(value).toLocaleDateString(i18n.language, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—'

  const money = (invoice: ManualInvoice): string => {
    if (invoice.amountMinor === undefined || !invoice.currency) return '—'
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: invoice.currency,
    }).format(invoice.amountMinor / 100)
  }

  const columns: ColumnDef<ManualInvoice>[] = [
    {
      id: 'invoice',
      meta: { width: '20%' },
      header: () => t('superAdmin.billing.columns.invoice'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.invoiceNumber ?? 'Draft'}</p>
          <p className="text-secondary truncate text-xs">{date(row.original.createdAt)}</p>
        </div>
      ),
    },
    {
      id: 'customer',
      meta: { width: '24%' },
      header: () => t('superAdmin.billing.columns.customer'),
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{row.original.customerName}</p>
          <p className="text-secondary truncate text-xs">{row.original.billingEmail ?? '—'}</p>
        </div>
      ),
    },
    {
      id: 'amount',
      meta: { width: '14%' },
      header: () => t('superAdmin.billing.columns.amount'),
      cell: ({ row }) => money(row.original),
    },
    {
      accessorKey: 'screenQuantity',
      meta: { width: '10%' },
      header: () => t('superAdmin.billing.columns.screens'),
    },
    {
      id: 'dueAt',
      meta: { width: '14%' },
      header: () => t('superAdmin.billing.columns.dueAt'),
      cell: ({ row }) => date(row.original.dueAt),
    },
    {
      accessorKey: 'status',
      meta: { width: '11%' },
      header: () => t('superAdmin.billing.columns.status'),
      cell: ({ row }) => (
        <Badge variant="outline" className={statusStyles[row.original.status]}>
          <span className="size-1.5 rounded-full bg-current" aria-hidden />
          {t(`superAdmin.billing.status.${row.original.status}`)}
        </Badge>
      ),
    },
    {
      id: 'actions',
      enableSorting: false,
      meta: { align: 'right', width: '7%' },
      header: () => <span className="sr-only">{t('common.actions')}</span>,
      cell: ({ row }) => {
        const invoice = row.original
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button type="button" variant="ghost" size="icon-sm">
                  <EllipsisIcon />
                  <span className="sr-only">{t('common.actions')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-48">
                {invoice.status === 'draft' ? (
                  <>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditInvoice(invoice)
                        setInvoiceDialogOpen(true)
                      }}
                    >
                      <FilePenLineIcon />
                      {t('superAdmin.billing.actions.edit')}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setSendInvoice(invoice)
                      }}
                    >
                      <SendIcon />
                      {t('superAdmin.billing.actions.markSent')}
                    </DropdownMenuItem>
                  </>
                ) : null}
                {invoice.status === 'sent' || invoice.status === 'overdue' ? (
                  <DropdownMenuItem
                    onClick={() => {
                      setPaymentReference('')
                      setPaidInvoice(invoice)
                    }}
                  >
                    <CheckCircle2Icon />
                    {t('superAdmin.billing.actions.markPaid')}
                  </DropdownMenuItem>
                ) : null}
                {invoice.status !== 'paid' && invoice.status !== 'void' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="danger"
                      onClick={() => {
                        setVoidReason('')
                        setVoidingInvoice(invoice)
                      }}
                    >
                      <XCircleIcon />
                      {t('superAdmin.billing.actions.void')}
                    </DropdownMenuItem>
                  </>
                ) : null}
                {invoice.status === 'paid' || invoice.status === 'void' ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="danger"
                      onClick={() => {
                        setArchiveTarget(invoice)
                      }}
                    >
                      <Trash2Icon />
                      {t('superAdmin.billing.actions.archive')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
  ]

  const handleMarkSent = async () => {
    if (!sendInvoice) return
    try {
      await markSent.mutateAsync(sendInvoice.id)
      toast.success(t('superAdmin.billing.sentSuccess'))
      setSendInvoice(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.billing.actionError')))
    }
  }

  const handleMarkPaid = async () => {
    if (!paidInvoice || !paymentReference.trim()) return
    try {
      await markPaid.mutateAsync({
        invoiceId: paidInvoice.id,
        paymentReference: paymentReference.trim(),
      })
      toast.success(t('superAdmin.billing.paidSuccess'))
      setPaidInvoice(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.billing.actionError')))
    }
  }

  const handleVoid = async () => {
    if (!voidingInvoice || voidReason.trim().length < 2) return
    try {
      await voidInvoice.mutateAsync({
        invoiceId: voidingInvoice.id,
        reason: voidReason.trim(),
      })
      toast.success(t('superAdmin.billing.voidSuccess'))
      setVoidingInvoice(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.billing.actionError')))
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      await archiveInvoice.mutateAsync(archiveTarget.id)
      toast.success(t('superAdmin.billing.archiveSuccess'))
      setArchiveTarget(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.billing.actionError')))
    }
  }

  if (overview.isPending) {
    return <Skeleton className="h-80 w-full rounded-xl" />
  }

  const overviewData = overview.data
  const exceptionItems = exceptions.data ?? []
  const invoiceItems = invoices.data?.items ?? []
  const overdueCount = overviewData?.overdueInvoiceCount ?? 0
  const exceptionCount = overviewData?.exceptionCount ?? 0
  const hasCriticalExceptions = (overviewData?.criticalExceptionCount ?? 0) > 0

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewCard
          icon={<CircleDollarSignIcon />}
          label={t('superAdmin.billing.overview.activeAccounts')}
          value={overviewData?.activeAccountCount ?? 0}
          tone="success"
        />
        <OverviewCard
          icon={<FileTextIcon />}
          label={t('superAdmin.billing.overview.openInvoices')}
          value={(overviewData?.sentInvoiceCount ?? 0) + (overviewData?.overdueInvoiceCount ?? 0)}
          tone="info"
        />
        <OverviewCard
          icon={<AlertTriangleIcon />}
          label={t('superAdmin.billing.overview.overdue')}
          value={overdueCount}
          tone="danger"
        />
        <OverviewCard
          icon={exceptionCount > 0 ? <AlertTriangleIcon /> : <CheckCircle2Icon />}
          label={t('superAdmin.billing.overview.exceptions')}
          value={exceptionCount}
          tone={hasCriticalExceptions ? 'danger' : exceptionCount > 0 ? 'warning' : 'success'}
        />
      </div>

      {exceptionItems.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>{t('superAdmin.billing.exceptions.title')}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {exceptionItems.slice(0, 12).map((item) => (
              <BillingExceptionRow key={item.key} item={item} />
            ))}
            {exceptionItems.length > 12 ? (
              <p className="text-secondary text-xs">
                {t('superAdmin.billing.exceptions.more', {
                  count: exceptionItems.length - 12,
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <Select
          value={status}
          onValueChange={(value) => {
            setStatus(value as StatusFilter)
            setPage(1)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(['all', 'draft', 'sent', 'paid', 'overdue', 'void'] as const).map((value) => (
              <SelectItem key={value} value={value}>
                {t(`superAdmin.billing.filters.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setEditInvoice(null)
            setInvoiceDialogOpen(true)
          }}
        >
          <PlusIcon />
          {t('superAdmin.billing.newInvoice')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={invoiceItems}
        emptyMessage={t('superAdmin.billing.empty')}
        isLoading={invoices.isFetching}
        {...(invoices.data
          ? {
              pagination: {
                page: invoices.data.page,
                pageSize: invoices.data.limit,
                total: invoices.data.total,
                onPageChange: setPage,
              },
            }
          : {})}
      />

      <BillingInvoiceDialog
        open={invoiceDialogOpen}
        onOpenChange={(open) => {
          setInvoiceDialogOpen(open)
          if (!open) setEditInvoice(null)
        }}
        invoice={editInvoice}
      />

      <Dialog
        open={Boolean(sendInvoice)}
        onOpenChange={(open) => {
          if (!open) setSendInvoice(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superAdmin.billing.send.title')}</DialogTitle>
            <DialogDescription>
              {sendInvoice?.missingFields.length
                ? t('superAdmin.billing.send.incomplete', {
                    fields: sendInvoice.missingFields
                      .map((field) => t(`superAdmin.billing.fields.${field}`))
                      .join(', '),
                  })
                : t('superAdmin.billing.send.description')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              onClick={() => {
                void handleMarkSent()
              }}
              disabled={markSent.isPending || Boolean(sendInvoice?.missingFields.length)}
            >
              {t('superAdmin.billing.actions.markSent')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(paidInvoice)}
        onOpenChange={(open) => {
          if (!open) setPaidInvoice(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superAdmin.billing.payment.title')}</DialogTitle>
            <DialogDescription>{t('superAdmin.billing.payment.description')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="payment-reference">
              {t('superAdmin.billing.payment.reference')}
            </FieldLabel>
            <Input
              id="payment-reference"
              value={paymentReference}
              onChange={(event) => {
                setPaymentReference(event.target.value)
              }}
            />
          </Field>
          <DialogFooter showCloseButton>
            <Button
              onClick={() => {
                void handleMarkPaid()
              }}
              disabled={markPaid.isPending || !paymentReference.trim()}
            >
              {t('superAdmin.billing.actions.markPaid')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(voidingInvoice)}
        onOpenChange={(open) => {
          if (!open) setVoidingInvoice(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superAdmin.billing.void.title')}</DialogTitle>
            <DialogDescription>{t('superAdmin.billing.void.description')}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel htmlFor="void-reason">{t('superAdmin.billing.void.reason')}</FieldLabel>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(event) => {
                setVoidReason(event.target.value)
              }}
            />
          </Field>
          <DialogFooter showCloseButton>
            <Button
              variant="danger"
              onClick={() => {
                void handleVoid()
              }}
              disabled={voidInvoice.isPending || voidReason.trim().length < 2}
            >
              {t('superAdmin.billing.actions.void')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(archiveTarget)}
        onOpenChange={(open) => {
          if (!open) setArchiveTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('superAdmin.billing.archive.title')}</DialogTitle>
            <DialogDescription>
              {t('superAdmin.billing.archive.description', {
                invoice: archiveTarget?.invoiceNumber ?? archiveTarget?.customerName ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="danger"
              onClick={() => {
                void handleArchive()
              }}
              disabled={archiveInvoice.isPending}
            >
              {t('superAdmin.billing.archive.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function OverviewCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode
  label: string
  value: number
  tone: 'info' | 'success' | 'warning' | 'danger'
}) {
  const styles = {
    info: {
      card: 'bg-info/[0.06] ring-info/20',
      icon: 'bg-info/12 text-info',
      value: 'text-info',
    },
    success: {
      card: 'bg-success/[0.06] ring-success/20',
      icon: 'bg-success/12 text-success',
      value: 'text-success',
    },
    warning: {
      card: 'bg-warning/[0.07] ring-warning/25',
      icon: 'bg-warning/12 text-warning',
      value: 'text-warning',
    },
    danger: {
      card: 'bg-danger/[0.06] ring-danger/25',
      icon: 'bg-danger/12 text-danger',
      value: 'text-danger',
    },
  }[tone]

  return (
    <Card size="sm" className={cn('transition-colors', styles.card)}>
      <CardContent className="flex items-center gap-3">
        <span
          className={cn(
            'flex size-10 shrink-0 items-center justify-center rounded-lg [&>svg]:size-5',
            styles.icon,
          )}
        >
          {icon}
        </span>
        <div>
          <p className="text-secondary text-xs">{label}</p>
          <p className={cn('text-xl font-semibold tabular-nums', styles.value)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function BillingExceptionRow({ item }: { item: BillingException }) {
  const { t, i18n } = useTranslation()
  const detailDate = item.dueAt ?? item.currentPeriodEnd

  return (
    <div className="border-quaternary flex items-start gap-3 rounded-lg border p-3">
      <AlertTriangleIcon
        className={item.severity === 'critical' ? 'text-danger' : 'text-secondary'}
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {t(`superAdmin.billing.exceptions.types.${item.type}`)}
        </p>
        <p className="text-secondary truncate text-xs">
          {item.customerName}
          {item.invoiceNumber ? ` · ${item.invoiceNumber}` : ''}
          {detailDate ? ` · ${new Date(detailDate).toLocaleDateString(i18n.language)}` : ''}
        </p>
      </div>
      <Badge variant={item.severity === 'critical' ? 'danger' : 'outline'}>
        {t(`superAdmin.billing.exceptions.severity.${item.severity}`)}
      </Badge>
    </div>
  )
}
