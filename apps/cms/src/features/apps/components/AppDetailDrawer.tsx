import { ArrowRightIcon, DownloadIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { useInstallApp } from '@/features/apps/hooks/useApps'
import { appAbout, appTagline } from '@/features/apps/lib/appCopy'
import type { EdgeApp } from '@/features/apps/types/app.types'

interface AppDetailDrawerProps {
  app: EdgeApp | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AppDetailDrawer({ app, open, onOpenChange }: AppDetailDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const installApp = useInstallApp()

  const isInstalled = app?.isInstalled ?? false

  const goToInstances = (id: string) => {
    onOpenChange(false)
    void navigate(`/apps/${id}/instances`)
  }

  const handleGetApp = () => {
    if (!app) return
    if (isInstalled) {
      goToInstances(app.id)
      return
    }
    // Install, then jump straight into the app's instances.
    installApp.mutate(app.id, {
      onSuccess: () => {
        goToInstances(app.id)
      },
    })
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {app ? (
          <div className="mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
            <div className="flex items-start gap-4">
              <AppIcon
                iconSvg={app.iconSvg}
                color={app.color}
                className="size-16 rounded-2xl shadow-md"
              />

              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <DrawerTitle className="text-lg">{app.name}</DrawerTitle>
                <span className="text-sm text-secondary">{appTagline(t, app.slug)}</span>

                <Button
                  type="button"
                  size="sm"
                  className="mt-1 w-fit"
                  disabled={installApp.isPending}
                  onClick={handleGetApp}
                >
                  {isInstalled ? (
                    <>
                      {t('apps.openApp')}
                      <ArrowRightIcon data-icon="inline-end" />
                    </>
                  ) : (
                    <>
                      <DownloadIcon data-icon="inline-start" />
                      {t('apps.getApp')}
                    </>
                  )}
                </Button>
              </div>
            </div>

            <DrawerDescription className="sr-only">{appTagline(t, app.slug)}</DrawerDescription>

            {appAbout(t, app.slug) ? (
              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-primary">{t('apps.aboutTitle')}</h3>
                <p className="text-sm leading-relaxed text-secondary">{appAbout(t, app.slug)}</p>
              </section>
            ) : null}
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
