import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronsDownUpIcon,
  PartyPopperIcon,
  XIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { useUploadStore } from '@/features/media/store/uploadStore'
import { OnboardingRing } from '@/features/onboarding/components/OnboardingRing'
import {
  useOnboarding,
  useOnboardingAutoRefresh,
  useUpdateOnboarding,
} from '@/features/onboarding/hooks/useOnboarding'
import {
  ONBOARDING_STEPS,
  resolveStepHref,
  type OnboardingStepConfig,
} from '@/features/onboarding/lib/onboardingSteps'
import { useOnboardingUiStore } from '@/features/onboarding/store/onboardingUiStore'
import type { OnboardingStepKey } from '@/features/onboarding/types/onboarding.types'
import { useOrganizationStore } from '@/features/organizations/store/organizationStore'
import { screensQueryKey } from '@/features/screens/lib/screenQueryKeys'
import type { ScreenSummary } from '@/features/screens/types/screen.types'
import { cn } from '@/lib/utils'

interface StepRowProps {
  config: OnboardingStepConfig
  index: number
  done: boolean
  expanded: boolean
  href: string
  onToggle: () => void
  onNavigate: () => void
}

function StepRow({
  config,
  index,
  done,
  expanded,
  href,
  onToggle,
  onNavigate,
}: StepRowProps) {
  const { t } = useTranslation()
  const base = `onboarding.steps.${config.key}`
  const bullets = t(`${base}.bullets`, { returnObjects: true }) as string[]

  return (
    <li
      className={cn(
        'border-secondary overflow-hidden rounded-xl border transition-colors',
        expanded ? 'bg-page' : 'bg-panel',
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-highlight flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors"
      >
        <span
          className={cn(
            'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums',
            done ? 'bg-success/12 text-success' : 'bg-brand/10 text-brand',
          )}
        >
          {done ? <CheckIcon className="size-3.5" /> : index + 1}
        </span>

        <span
          className={cn(
            'min-w-0 flex-1 text-sm font-medium',
            done ? 'text-secondary line-through' : 'text-primary',
          )}
        >
          {t(`${base}.title`)}
        </span>

        <ChevronDownIcon
          className={cn(
            'text-secondary size-4 shrink-0 transition-transform',
            expanded && 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="px-3 pb-3 pl-12.5">
          <p className="text-secondary text-xs">{t(`${base}.description`)}</p>

          <ul className="text-secondary mt-2 space-y-1 text-xs">
            {bullets.map((bullet) => (
              <li key={bullet} className="flex gap-1.5">
                <span aria-hidden className="text-secondary/60">
                  •
                </span>
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <Button asChild size="sm" variant={done ? 'outline' : 'default'} className="mt-3">
            <Link to={href} onClick={onNavigate}>
              {t(`${base}.cta`)}
              <ArrowRightIcon data-icon="inline-end" />
            </Link>
          </Button>
        </div>
      ) : null}
    </li>
  )
}

/**
 * The floating setup checklist.
 *
 * Deliberately not a page: a new customer's first hour is spent moving between
 * Media, Playlists and Screens, and a guide that only exists on the dashboard is
 * one they have to remember to go back to. This follows them, remembers which
 * step is next, and collapses to a pill the moment it is in the way.
 */
export function OnboardingWidget() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { data } = useOnboarding()
  const update = useUpdateOnboarding()

  const open = useOnboardingUiStore((state) => state.open)
  const setOpen = useOnboardingUiStore((state) => state.setOpen)
  const expandedStep = useOnboardingUiStore((state) => state.expandedStep)
  const setExpandedStep = useOnboardingUiStore((state) => state.setExpandedStep)

  const organizationId = useOrganizationStore((state) => state.activeOrganizationId)
  // The upload manager owns the bottom-right corner while a transfer is running,
  // and step one *is* uploading — so step aside rather than sit on top of it.
  const uploadsVisible = useUploadStore((state) => state.jobs.length > 0)

  const visible =
    data !== undefined &&
    data.status !== 'dismissed' &&
    (data.status === 'active' || data.showCelebration)

  useOnboardingAutoRefresh(visible)

  if (!visible) {
    return null
  }

  const position = cn(
    'fixed right-4 bottom-4 z-40',
    uploadsVisible && 'sm:right-[23.5rem] max-sm:bottom-[4.75rem]',
  )

  const dismiss = () => {
    update.mutate({ dismissed: true })
  }

  if (!open) {
    return (
      <div className={position}>
        <Button
          variant="outline"
          onClick={() => {
            setOpen(true)
          }}
          className="gap-2 rounded-full shadow-lg"
        >
          <OnboardingRing percent={data.percent} size={18} />
          {t('onboarding.launcher')}
          <span className="text-secondary text-xs tabular-nums">
            {data.completedCount}/{data.totalCount}
          </span>
        </Button>
      </div>
    )
  }

  const screens = queryClient.getQueryData<ScreenSummary[]>(
    screensQueryKey(organizationId),
  )
  const firstScreenId = screens?.[0]?.id ?? null

  const doneByKey = new Map<OnboardingStepKey, boolean>(
    data.steps.map((step) => [step.key, step.done]),
  )
  // Unfold whatever the user opened last; otherwise pick up where they left off.
  const activeKey = expandedStep ?? data.currentStep

  return (
    <section
      className={cn(
        position,
        'border-secondary bg-panel flex w-[min(100vw-2rem,23rem)] flex-col overflow-hidden rounded-2xl border shadow-xl',
      )}
      aria-label={t('onboarding.title')}
    >
      <header className="border-secondary flex items-center gap-2.5 border-b px-3.5 py-3">
        <OnboardingRing percent={data.percent} size={26} />
        <div className="min-w-0 flex-1">
          <p className="text-primary text-sm font-semibold">{t('onboarding.title')}</p>
          <p className="text-secondary text-xs">
            {t('onboarding.progress', {
              completed: data.completedCount,
              total: data.totalCount,
            })}
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('onboarding.minimize')}
          onClick={() => {
            setOpen(false)
          }}
        >
          <ChevronsDownUpIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={t('onboarding.dismiss')}
          onClick={dismiss}
        >
          <XIcon />
        </Button>
      </header>

      {data.showCelebration ? (
        <div className="flex flex-col items-center gap-2 px-5 py-6 text-center">
          <span className="bg-success/12 text-success flex size-11 items-center justify-center rounded-full">
            <PartyPopperIcon className="size-5" />
          </span>
          <p className="text-primary text-sm font-semibold">
            {t('onboarding.complete.title')}
          </p>
          <p className="text-secondary text-xs">{t('onboarding.complete.description')}</p>
          <Button
            size="sm"
            className="mt-2"
            disabled={update.isPending}
            onClick={() => {
              update.mutate({ completionAcknowledged: true })
            }}
          >
            {t('onboarding.complete.cta')}
          </Button>
        </div>
      ) : (
        <>
          {/* Sized so all five steps plus one expanded body fit on a laptop —
              scrolling only kicks in on genuinely short viewports. */}
          <ol className="max-h-[min(68vh,32rem)] space-y-1.5 overflow-y-auto p-2.5">
            {ONBOARDING_STEPS.map((config, index) => (
              <StepRow
                key={config.key}
                config={config}
                index={index}
                done={doneByKey.get(config.key) ?? false}
                expanded={activeKey === config.key}
                href={resolveStepHref(config, firstScreenId)}
                onToggle={() => {
                  setExpandedStep(activeKey === config.key ? null : config.key)
                }}
                // Get out of the way of the page the user just asked for.
                onNavigate={() => {
                  setOpen(false)
                }}
              />
            ))}
          </ol>

          <footer className="border-secondary text-secondary border-t px-3.5 py-2.5 text-xs">
            {t('onboarding.help.prefix')}{' '}
            <Link
              to="/faq"
              className="text-primary font-medium underline underline-offset-2"
              onClick={() => {
                setOpen(false)
              }}
            >
              {t('onboarding.help.link')}
            </Link>
          </footer>
        </>
      )}
    </section>
  )
}
