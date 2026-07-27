import { CheckIcon, DownloadIcon, MoreHorizontalIcon, Trash2Icon } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from '@/components/ui/drawer'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { AppIcon } from '@/features/apps/components/AppIcon'
import { AppInstancesSection } from '@/features/apps/components/AppInstancesSection'
import { AppDrawerNestedOverlayContext } from '@/features/apps/components/appDrawerNestedContext'
import { useCreateInstance, useInstallApp } from '@/features/apps/hooks/useApps'
import { appAbout, appTagline } from '@/features/apps/lib/appCopy'
import type { EdgeApp } from '@/features/apps/types/app.types'

interface AppDrawerProps {
  app: EdgeApp | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRequestUninstall: (app: EdgeApp) => void
}

/**
 * The app's home: a bottom drawer opened from any catalog card. It shows the app
 * (icon, tagline, About) and — once installed — its saved copies inline via
 * {@link AppInstancesSection}, so there's no separate instances page. Installing
 * happens right here; the drawer re-renders into the installed state on success.
 */
export function AppDrawer({ app, open, onOpenChange, onRequestUninstall }: AppDrawerProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const installApp = useInstallApp()
  const createInstance = useCreateInstance()

  // A menu/dialog rendered inside the drawer is portaled outside its DOM, so
  // dismissing one reads as an outside interaction and vaul closes the whole
  // drawer. Keep vaul's `dismissible` off while any nested overlay is open — and
  // for a beat after the last one closes, since vaul reacts to focus returning on
  // a later tick. Nested overlays report open/close through the context.
  const nestedOpenCountRef = useRef(0)
  const reenableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [dismissible, setDismissible] = useState(true)

  const registerNestedOverlay = useCallback((isOpen: boolean) => {
    nestedOpenCountRef.current = Math.max(0, nestedOpenCountRef.current + (isOpen ? 1 : -1))
    if (reenableTimerRef.current) clearTimeout(reenableTimerRef.current)
    if (nestedOpenCountRef.current > 0) {
      setDismissible(false)
    } else {
      reenableTimerRef.current = setTimeout(() => {
        setDismissible(true)
      }, 300)
    }
  }, [])

  useEffect(
    () => () => {
      if (reenableTimerRef.current) clearTimeout(reenableTimerRef.current)
    },
    [],
  )

  const isInstalled = app?.isInstalled ?? false
  const isGettingApp = installApp.isPending || createInstance.isPending

  // "Get app" installs, spins up the first setup, and drops the operator straight
  // into its editor — no extra clicks to start configuring.
  const handleGetApp = (target: EdgeApp) => {
    installApp.mutate(target.id, {
      onSuccess: () => {
        createInstance.mutate(
          { appId: target.id },
          {
            onSuccess: (instance) => {
              void navigate(`/apps/${target.id}/instances/${instance.id}`)
            },
          },
        )
      },
    })
  }

  const about = app ? appAbout(t, app.slug) : ''

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={dismissible}>
      <DrawerContent>
        {app ? (
          <AppDrawerNestedOverlayContext.Provider value={registerNestedOverlay}>
            <div className="mx-auto flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-6 overflow-y-auto p-6 pt-4">
              <div className="flex items-start gap-4">
                <AppIcon
                  iconSvg={app.iconSvg}
                  color={app.color}
                  className="size-16 shrink-0 rounded-2xl shadow-md"
                />

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col gap-1">
                      <DrawerTitle className="text-lg">{app.name}</DrawerTitle>
                      <span className="text-secondary text-sm">{appTagline(t, app.slug)}</span>
                    </div>

                    {isInstalled ? (
                      <DropdownMenu onOpenChange={registerNestedOverlay}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-secondary shrink-0"
                          >
                            <MoreHorizontalIcon />
                            <span className="sr-only">{t('common.actions')}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-auto min-w-44">
                          <DropdownMenuItem
                            variant="danger"
                            onClick={() => {
                              onRequestUninstall(app)
                            }}
                          >
                            <Trash2Icon />
                            {t('apps.actions.uninstall')}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>

                  <div className="mt-1 flex items-center gap-2">
                    {isInstalled ? (
                      <span className="bg-success/10 text-success inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium">
                        <CheckIcon className="size-3" />
                        {t('apps.installed')}
                      </span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        className="w-fit"
                        disabled={isGettingApp}
                        onClick={() => {
                          handleGetApp(app)
                        }}
                      >
                        <DownloadIcon data-icon="inline-start" />
                        {t('apps.getApp')}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <DrawerDescription className="sr-only">{appTagline(t, app.slug)}</DrawerDescription>

              {about ? (
                <section className="flex flex-col gap-2">
                  <h3 className="text-primary text-sm font-medium">{t('apps.aboutTitle')}</h3>
                  <p className="text-secondary text-sm leading-relaxed">{about}</p>
                </section>
              ) : null}

              {isInstalled ? <AppInstancesSection app={app} /> : null}
            </div>
          </AppDrawerNestedOverlayContext.Provider>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
