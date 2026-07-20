import { ListVideoIcon, PlusIcon } from 'lucide-react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'

interface DashboardHeroProps {
  userName: string | undefined
  online: number
  total: number
}

export function DashboardHero({ userName, online, total }: DashboardHeroProps) {
  const { t } = useTranslation()

  const greetingKey = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return 'dashboard.hero.morning'
    if (hour < 18) return 'dashboard.hero.afternoon'
    return 'dashboard.hero.evening'
  }, [])

  const hasScreens = total > 0
  const subtitle = hasScreens
    ? t('dashboard.hero.subtitleLive', { online, total })
    : t('dashboard.hero.subtitleEmpty')

  return (
    <section className="border-secondary bg-panel relative overflow-hidden rounded-2xl border">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="bg-brand/6 absolute -top-28 -right-10 size-72 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(var(--border-secondary)_1px,transparent_1px)] mask-[radial-gradient(120%_120%_at_100%_0%,black,transparent_60%)] bg-size-[18px_18px] opacity-50" />
      </div>

      <div className="relative flex flex-col gap-6 p-6 sm:p-8 md:flex-row md:items-end md:justify-between">
        <div className="flex min-w-0 flex-col gap-3">
          {hasScreens ? (
            <span className="border-secondary bg-page/60 text-secondary inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
              <span className="relative flex size-2">
                <span className="bg-success absolute inline-flex size-full animate-ping rounded-full opacity-75" />
                <span className="bg-success relative inline-flex size-2 rounded-full" />
              </span>
              {t('dashboard.hero.livePill', { online, total })}
            </span>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <h1 className="text-primary text-2xl font-semibold tracking-tight sm:text-3xl">
              {userName ? t(greetingKey, { name: userName }) : t('dashboard.title')}
            </h1>
            <p className="text-secondary max-w-xl text-sm">{subtitle}</p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Button asChild size="sm">
            <Link to="/screens">
              <PlusIcon data-icon="inline-start" />
              {t('dashboard.hero.addScreen')}
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline">
            <Link to="/playlists">
              <ListVideoIcon data-icon="inline-start" />
              {t('dashboard.hero.newPlaylist')}
            </Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
