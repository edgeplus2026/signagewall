import {
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  ListVideoIcon,
  MonitorIcon,
  RocketIcon,
  XIcon,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { cn } from '@/lib/utils'

const STORAGE_KEY = 'dashboard:onboardingDismissed'

function readDismissed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

interface Step {
  key: string
  icon: LucideIcon
  to: string
  done: boolean
}

interface GettingStartedProps {
  screens: number
  playlists: number
  media: number
}

/**
 * First-run guide shown below the hero. Walks a new user through the three
 * setup steps and checks them off as content appears. Dismissible, with the
 * choice persisted to localStorage so returning users aren't nagged.
 */
export function GettingStarted({ screens, playlists, media }: GettingStartedProps) {
  const { t } = useTranslation()
  const [dismissed, setDismissed] = useState(readDismissed)

  const steps: Step[] = [
    { key: 'media', icon: ImageIcon, to: '/media', done: media > 0 },
    { key: 'playlists', icon: ListVideoIcon, to: '/playlists', done: playlists > 0 },
    { key: 'screens', icon: MonitorIcon, to: '/screens', done: screens > 0 },
  ]

  const allDone = steps.every((step) => step.done)

  // Nothing left to guide, or the user asked us to stop showing it.
  if (dismissed || allDone) {
    return null
  }

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  return (
    <section className="border-brand/15 bg-brand/[0.03] relative rounded-2xl border p-5 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('dashboard.gettingStarted.dismiss')}
        className="text-secondary hover:text-primary hover:bg-highlight absolute top-4 right-4 flex size-7 items-center justify-center rounded-md transition-colors"
      >
        <XIcon className="size-4" />
      </button>

      <header className="flex items-center gap-3 pr-8">
        <div className="bg-brand text-brand-contrast flex size-9 shrink-0 items-center justify-center rounded-lg">
          <RocketIcon className="size-4.5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-primary text-sm font-semibold">
            {t('dashboard.gettingStarted.title')}
          </h2>
          <p className="text-secondary text-xs">{t('dashboard.gettingStarted.subtitle')}</p>
        </div>
      </header>

      <ol className="mt-4 grid gap-3 sm:grid-cols-3">
        {steps.map((step, index) => (
          <li key={step.key}>
            <Link
              to={step.to}
              className={cn(
                'group border-secondary bg-panel flex h-full items-center gap-3 rounded-xl border p-3.5 transition-all',
                step.done ? 'opacity-70' : 'hover:border-brand/40 hover:shadow-sm',
              )}
            >
              <span
                className={cn(
                  'flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums transition-colors',
                  step.done
                    ? 'bg-success/12 text-success'
                    : 'bg-brand/10 text-brand group-hover:bg-brand/15',
                )}
              >
                {step.done ? <CheckIcon className="size-4" /> : index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    'text-primary text-sm font-medium',
                    step.done && 'text-secondary line-through',
                  )}
                >
                  {t(`dashboard.gettingStarted.steps.${step.key}.title`)}
                </p>
                <p className="text-secondary truncate text-xs">
                  {t(`dashboard.gettingStarted.steps.${step.key}.description`)}
                </p>
              </div>
              {step.done ? null : (
                <ArrowRightIcon className="text-secondary/50 group-hover:text-primary size-4 shrink-0 transition-all group-hover:translate-x-0.5" />
              )}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  )
}
