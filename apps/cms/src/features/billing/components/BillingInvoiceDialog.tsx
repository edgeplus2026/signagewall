import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  useCreateManualInvoice,
  useUpdateManualInvoice,
} from '@/features/billing/hooks/useAdminBilling'
import type {
  ManualInvoice,
  ManualInvoicePayload,
  UpdateManualInvoicePayload,
} from '@/features/billing/types/billing.types'
import { useAdminUsers } from '@/features/super-admin/hooks/useAdminUsers'
import { getApiErrorMessage } from '@/lib/api-error'

const FORM_ID = 'manual-invoice-form'

interface InvoiceFormValues {
  customerUserId: string
  screenQuantity: string
  invoiceNumber: string
  amount: string
  currency: string
  billingEmail: string
  companyName: string
  dueAt: string
  servicePeriodStart: string
  servicePeriodEnd: string
  note: string
}

const localDateInput = (date: Date): string => {
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return shifted.toISOString().slice(0, 10)
}

const defaultValues = (): InvoiceFormValues => {
  const today = new Date()
  const due = new Date(today)
  due.setDate(due.getDate() + 14)
  const periodEnd = new Date(today)
  periodEnd.setMonth(periodEnd.getMonth() + 1)

  return {
    customerUserId: '',
    screenQuantity: '1',
    invoiceNumber: '',
    amount: '',
    currency: 'EUR',
    billingEmail: '',
    companyName: '',
    dueAt: localDateInput(due),
    servicePeriodStart: localDateInput(today),
    servicePeriodEnd: localDateInput(periodEnd),
    note: '',
  }
}

const datePart = (value: string | null): string => value?.slice(0, 10) ?? ''

const invoiceValues = (invoice: ManualInvoice): InvoiceFormValues => ({
  customerUserId: invoice.customerUserId,
  screenQuantity: invoice.screenQuantity.toString(),
  invoiceNumber: invoice.invoiceNumber ?? '',
  amount: invoice.amountMinor === undefined ? '' : (invoice.amountMinor / 100).toFixed(2),
  currency: invoice.currency ?? 'EUR',
  billingEmail: invoice.billingEmail ?? '',
  companyName: invoice.companyName ?? '',
  dueAt: datePart(invoice.dueAt),
  servicePeriodStart: datePart(invoice.servicePeriodStart),
  servicePeriodEnd: datePart(invoice.servicePeriodEnd),
  note: invoice.note ?? '',
})

const optionalText = (value: string): string | undefined => {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

const optionalDate = (value: string): string | undefined =>
  value ? new Date(`${value}T12:00:00.000Z`).toISOString() : undefined

interface BillingInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: ManualInvoice | null
}

export function BillingInvoiceDialog({ open, onOpenChange, invoice }: BillingInvoiceDialogProps) {
  const { t } = useTranslation()
  const createInvoice = useCreateManualInvoice()
  const updateInvoice = useUpdateManualInvoice()
  const { data: users } = useAdminUsers({
    page: 1,
    limit: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  })
  const { register, handleSubmit, reset, setValue, control } = useForm<InvoiceFormValues>({
    defaultValues: defaultValues(),
  })

  const selectedUserId = useWatch({ control, name: 'customerUserId' })
  const isEditing = Boolean(invoice)
  const isPending = createInvoice.isPending || updateInvoice.isPending

  useEffect(() => {
    if (!open) return
    reset(invoice ? invoiceValues(invoice) : defaultValues())
  }, [invoice, open, reset])

  const onSubmit = handleSubmit(async (values) => {
    const screenQuantity = Number(values.screenQuantity)
    if (!Number.isInteger(screenQuantity) || screenQuantity < 1) {
      toast.error(t('superAdmin.billing.form.invalidScreens'))
      return
    }

    const amountNumber = values.amount.trim() ? Number(values.amount) : undefined
    if (amountNumber !== undefined && (!Number.isFinite(amountNumber) || amountNumber < 0)) {
      toast.error(t('superAdmin.billing.form.invalidAmount'))
      return
    }

    const invoiceNumber = optionalText(values.invoiceNumber)
    const currency = optionalText(values.currency)?.toUpperCase()
    const billingEmail = optionalText(values.billingEmail)
    const companyName = optionalText(values.companyName)
    const dueAt = optionalDate(values.dueAt)
    const servicePeriodStart = optionalDate(values.servicePeriodStart)
    const servicePeriodEnd = optionalDate(values.servicePeriodEnd)
    const note = optionalText(values.note)

    const common = {
      screenQuantity,
      ...(invoiceNumber ? { invoiceNumber } : {}),
      ...(amountNumber !== undefined ? { amountMinor: Math.round(amountNumber * 100) } : {}),
      ...(currency ? { currency } : {}),
      ...(billingEmail ? { billingEmail } : {}),
      ...(companyName ? { companyName } : {}),
      ...(dueAt ? { dueAt } : {}),
      ...(servicePeriodStart ? { servicePeriodStart } : {}),
      ...(servicePeriodEnd ? { servicePeriodEnd } : {}),
      ...(note ? { note } : {}),
    } satisfies UpdateManualInvoicePayload

    try {
      if (invoice) {
        await updateInvoice.mutateAsync({ invoiceId: invoice.id, payload: common })
      } else {
        if (!values.customerUserId) {
          toast.error(t('superAdmin.billing.form.customerRequired'))
          return
        }
        await createInvoice.mutateAsync({
          customerUserId: values.customerUserId,
          ...common,
        } satisfies ManualInvoicePayload)
      }

      toast.success(
        t(invoice ? 'superAdmin.billing.form.updated' : 'superAdmin.billing.form.created'),
      )
      onOpenChange(false)
    } catch (error) {
      toast.error(getApiErrorMessage(error, t('superAdmin.billing.form.error')))
    }
  })

  const availableUsers = users?.items.filter((user) => !user.isSuperAdmin) ?? []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {t(isEditing ? 'superAdmin.billing.form.editTitle' : 'superAdmin.billing.form.title')}
          </DialogTitle>
          <DialogDescription>{t('superAdmin.billing.form.description')}</DialogDescription>
        </DialogHeader>

        <form
          id={FORM_ID}
          className="px-1"
          onSubmit={(event) => {
            void onSubmit(event)
          }}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2">
              <FieldLabel>{t('superAdmin.billing.form.customer')}</FieldLabel>
              <Select
                disabled={isEditing}
                value={selectedUserId}
                onValueChange={(userId) => {
                  setValue('customerUserId', userId)
                  const user = availableUsers.find((candidate) => candidate.id === userId)
                  if (user) setValue('billingEmail', user.email)
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('superAdmin.billing.form.selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name} — {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="invoice-number">
                {t('superAdmin.billing.form.invoiceNumber')}
              </FieldLabel>
              <Input id="invoice-number" {...register('invoiceNumber')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="billing-email">
                {t('superAdmin.billing.form.billingEmail')}
              </FieldLabel>
              <Input id="billing-email" type="email" {...register('billingEmail')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="company-name">{t('superAdmin.billing.form.company')}</FieldLabel>
              <Input id="company-name" {...register('companyName')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="screen-quantity">
                {t('superAdmin.billing.form.screens')}
              </FieldLabel>
              <Input
                id="screen-quantity"
                type="number"
                min={1}
                max={10000}
                {...register('screenQuantity')}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="invoice-amount">
                {t('superAdmin.billing.form.amount')}
              </FieldLabel>
              <Input
                id="invoice-amount"
                type="number"
                min={0}
                step="0.01"
                {...register('amount')}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="invoice-currency">
                {t('superAdmin.billing.form.currency')}
              </FieldLabel>
              <Input
                id="invoice-currency"
                maxLength={3}
                className="uppercase"
                {...register('currency')}
              />
            </Field>

            <Field>
              <FieldLabel htmlFor="period-start">
                {t('superAdmin.billing.form.periodStart')}
              </FieldLabel>
              <Input id="period-start" type="date" {...register('servicePeriodStart')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="period-end">{t('superAdmin.billing.form.periodEnd')}</FieldLabel>
              <Input id="period-end" type="date" {...register('servicePeriodEnd')} />
            </Field>

            <Field>
              <FieldLabel htmlFor="invoice-due-at">{t('superAdmin.billing.form.dueAt')}</FieldLabel>
              <Input id="invoice-due-at" type="date" {...register('dueAt')} />
            </Field>

            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="invoice-note">{t('superAdmin.billing.form.note')}</FieldLabel>
              <Textarea id="invoice-note" rows={3} {...register('note')} />
              <FieldDescription>{t('superAdmin.billing.form.draftHint')}</FieldDescription>
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter showCloseButton>
          <Button type="submit" form={FORM_ID} disabled={isPending}>
            {t('superAdmin.billing.form.saveDraft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
