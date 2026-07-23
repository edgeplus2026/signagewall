import { CopyIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { CopyableDetailRow } from '@/features/super-admin/components/CopyableDetailRow'
import { useAdminUser } from '@/features/super-admin/hooks/useAdminUsers'

interface AdminUserSheetProps {
  userId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AdminUserSheet({ userId, open, onOpenChange }: AdminUserSheetProps) {
  const { t, i18n } = useTranslation()

  /**
   * An optional detail line. Blank counts as missing, not as a value — which
   * is why this is not `value ?? notSet`: the API returns `''` for a field the
   * user cleared, and rendering an empty row reads as a broken layout.
   */
  const orNotSet = (value: string | undefined | null) =>
    value !== undefined && value !== null && value.trim() !== ''
      ? value
      : t('superAdmin.userSheet.notSet')
  const { data: user, isLoading, isError } = useAdminUser(open ? userId : null)

  const formatDate = (value: string) =>
    new Date(value).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(t('superAdmin.userSheet.copySuccess'))
    } catch {
      toast.error(t('superAdmin.userSheet.copyError'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full flex-col gap-0 sm:max-w-md" showCloseButton={false}>
        <SheetHeader className="shrink-0 border-b border-secondary">
          <SheetTitle>{t('superAdmin.userSheet.title')}</SheetTitle>
          <SheetDescription>{t('superAdmin.userSheet.description')}</SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto py-4">
          {isLoading ? (
            <div className="flex flex-col gap-3 px-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          ) : null}

          {isError ? (
            <p className="text-secondary px-4 text-sm">{t('superAdmin.userSheet.loadError')}</p>
          ) : null}

          {user ? (
            <div className="divide-quaternary bg-panel mx-4 divide-y overflow-hidden rounded-lg shadow-[0_0_0_1px_var(--border-quaternary)]">
              <CopyableDetailRow
                label={t('superAdmin.userSheet.fields.id')}
                value={user.id}
              />
              <CopyableDetailRow label={t('common.name')} value={user.name} />
              <CopyableDetailRow label={t('common.email')} value={user.email} />
              <CopyableDetailRow
                label={t('common.phone')}
                value={orNotSet(user.phone)}
                copyValue={user.phone ?? ''}
              />
              <CopyableDetailRow
                label={t('common.company')}
                value={orNotSet(user.company)}
                copyValue={user.company ?? ''}
              />
              <CopyableDetailRow
                label={t('superAdmin.userSheet.fields.provider')}
                value={user.provider}
              />
              <CopyableDetailRow
                label={t('superAdmin.userSheet.fields.status')}
                value={
                  user.isActive
                    ? t('superAdmin.userSheet.status.active')
                    : t('superAdmin.userSheet.status.inactive')
                }
              />
              <CopyableDetailRow
                label={t('superAdmin.userSheet.fields.role')}
                value={
                  user.isSuperAdmin
                    ? t('superAdmin.userSheet.role.superAdmin')
                    : t('superAdmin.userSheet.role.user')
                }
              />
              <CopyableDetailRow
                label={t('superAdmin.userSheet.fields.createdAt')}
                value={formatDate(user.createdAt)}
              />

              <div className="flex flex-col gap-2 px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-secondary text-[13px]">
                    {t('superAdmin.userSheet.fields.organizations')}
                  </span>
                </div>
                {user.organizations.length === 0 ? (
                  <span className="text-secondary text-sm">
                    {t('superAdmin.userSheet.noOrganizations')}
                  </span>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {user.organizations.map((organization) => (
                      <li
                        key={organization.id}
                        className="bg-page flex flex-col gap-1 rounded-md px-3 py-2 text-sm"
                      >
                        <span className="text-primary font-medium">{organization.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-secondary text-xs break-all">
                            {organization.id} · {t(`users.roles.${organization.role}`)}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-secondary size-6 shrink-0"
                            onClick={() => void copyText(organization.id)}
                          >
                            <CopyIcon className="size-3" />
                            <span className="sr-only">{t('superAdmin.userSheet.copy')}</span>
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>

        <SheetFooter className="shrink-0 border-t border-secondary">
          <Button type="button" variant="outline" className="w-full" onClick={() => { onOpenChange(false); }}>
            {t('common.cancel')}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
