import { ArrowRightIcon, DownloadIcon, RocketIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from '@/components/ui/drawer'
import { AppScreenshotCarousel } from '@/features/apps/components/AppScreenshotCarousel'
import { useInstallApp } from '@/features/apps/hooks/useApps'
import type { EdgeApp } from '@/features/apps/types/app.types'
import { cn } from '@/lib/utils'

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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        {app ? (
          <div className="mx-auto flex w-full max-w-5xl min-h-0 flex-1 flex-col gap-8 overflow-y-auto p-6 pt-4 md:flex-row">
            {/* Left — carousel */}
            <div className="md:w-1/2 md:shrink-0">
              <AppScreenshotCarousel images={app.screenshots} alt={app.name} />
            </div>

            {/* Right — details */}
            <div className="flex min-w-0 flex-1 flex-col gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    'flex size-14 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white shadow-md',
                    app.accent.logo,
                  )}
                >
                  <RocketIcon className="size-6" />
                </div>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <DrawerTitle className="text-lg">{app.name}</DrawerTitle>
                  <span className="text-xs text-secondary">{app.tagline}</span>

                  {isInstalled ? (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-1 w-fit"
                      onClick={() => {
                        onOpenChange(false)
                        void navigate(`/apps/${app.id}/instances`)
                      }}
                    >
                      {t('apps.openApp')}
                      <ArrowRightIcon data-icon="inline-end" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="mt-1 w-fit"
                      onClick={() => {
                        installApp.mutate(app.id)
                      }}
                    >
                      <DownloadIcon data-icon="inline-start" />
                      {t('apps.getApp')}
                    </Button>
                  )}
                </div>
              </div>

              <DrawerDescription className="sr-only">{app.tagline}</DrawerDescription>

              <section className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-primary">
                  {t('apps.aboutTitle')}
                </h3>
                <p className="text-sm leading-relaxed text-secondary">{app.about}</p>
              </section>

              <section className="grid grid-cols-2 gap-3 rounded-xl bg-page/60 p-4 ring-1 ring-quaternary">
                <Meta label={t('apps.meta.status')}>
                  {isInstalled
                    ? t('apps.meta.statusInstalled')
                    : t('apps.meta.statusNotInstalled')}
                </Meta>
                <Meta label={t('apps.meta.updated')}>{t('apps.meta.recently')}</Meta>
              </section>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}

function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] tracking-wide text-secondary uppercase">{label}</span>
      <span className="text-sm font-medium text-primary">{children}</span>
    </div>
  )
}
