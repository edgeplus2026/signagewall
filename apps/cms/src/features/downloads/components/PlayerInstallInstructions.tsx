import { DownloadIcon, ExternalLinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAndroidRelease } from '@/features/downloads/hooks/useAndroidRelease'
import { SettingsRow, SettingsSection } from '@/features/settings/components/SettingsSection'

interface PlayerInstallInstructionsProps {
  /**
   * Web player URL, offered as the no-install route. Absent where the caller has
   * nothing useful to point at.
   */
  webPlayerUrl?: string | undefined
}

interface Step {
  title: string
  detail: string
}

/**
 * How to get the player onto a screen, and what Android will ask along the way.
 *
 * Shown in two places on purpose: on the download page, and directly under the
 * pairing code on a screen that has no device yet — which is the exact moment
 * somebody is standing in front of a blank screen wondering what to do next.
 *
 * Written for any Android device rather than the one it was tested on: a television,
 * a box or a stick, some of which have a browser and some of which have no file
 * manager, and all of which bury the settings somewhere slightly different. The
 * steps say so instead of naming one menu path that would be wrong everywhere else.
 *
 * Each step also says WHY, because two of them look skippable and are not: a device
 * left free to sleep takes the app's network down with it, and a player without the
 * overlay permission cannot put itself back after a crash. Both turn a screen that
 * would have recovered on its own into a site visit.
 */
export function PlayerInstallInstructions({ webPlayerUrl }: PlayerInstallInstructionsProps) {
  const { t } = useTranslation()
  const { data: release, isLoading } = useAndroidRelease()

  const installSteps = t('downloads.android.install.steps', {
    returnObjects: true,
  }) as Step[]
  const setupSteps = t('downloads.android.setup.steps', {
    returnObjects: true,
  }) as Step[]

  return (
    <div className="flex flex-col gap-7">
      <SettingsSection title={t('downloads.android.title')}>
        <SettingsRow
          label={t('downloads.android.fileTitle')}
          description={
            release
              ? t('downloads.android.fileDescription', {
                  version: release.versionName,
                  size: formatBytes(release.size),
                })
              : t('downloads.android.fileUnknown')
          }
        >
          <Button variant="secondary" size="sm" asChild disabled={!release}>
            {release ? (
              <a href={release.url} download>
                <DownloadIcon className="size-4" />
                {t('downloads.android.download')}
              </a>
            ) : (
              <span>
                <DownloadIcon className="size-4" />
                {isLoading ? t('downloads.android.loading') : t('downloads.android.unavailable')}
              </span>
            )}
          </Button>
        </SettingsRow>

        <StepList steps={installSteps} />
      </SettingsSection>

      <SettingsSection title={t('downloads.android.setup.title')}>
        <div className="px-4 pt-3.5">
          <p className="text-secondary text-[13px] leading-snug">
            {t('downloads.android.setup.intro')}
          </p>
        </div>
        <StepList steps={setupSteps} />
        <div className="px-4 pt-0.5 pb-4">
          <p className="text-muted-foreground text-xs leading-snug">
            {t('downloads.android.afterwards')}
          </p>
        </div>
      </SettingsSection>

      {webPlayerUrl ? (
        <SettingsSection title={t('downloads.web.title')}>
          <SettingsRow
            label={t('downloads.web.rowTitle')}
            description={t('downloads.web.rowDescription')}
          >
            <Button variant="outline" size="sm" asChild>
              <a href={webPlayerUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLinkIcon className="size-4" />
                {t('downloads.web.open')}
              </a>
            </Button>
          </SettingsRow>
        </SettingsSection>
      ) : null}
    </div>
  )
}

/**
 * A numbered walkthrough rather than a bulleted list.
 *
 * Whoever is reading this is next to the screen with a remote in one hand, working
 * through it a line at a time — so each step gets a number to hold their place
 * with, a title short enough to scan, and the reasoning underneath where it stays
 * out of the way. The rule down the left is what turns nine separate sentences into
 * one sequence with a beginning and an end.
 */
function StepList({ steps }: { steps: Step[] }) {
  return (
    <ol className="flex flex-col px-4 py-4">
      {steps.map((step, index) => {
        const last = index === steps.length - 1
        return (
          <li key={step.title} className="flex gap-3.5">
            <div className="flex flex-col items-center">
              <span className="text-secondary ring-quaternary bg-panel flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ring-1">
                {index + 1}
              </span>
              {/* Between the badges only: a rule hanging below the final step reads
                  as a step that failed to render. */}
              {last ? null : <span className="bg-quaternary w-px flex-1" />}
            </div>
            <div className={last ? 'pb-0' : 'pb-5'}>
              <p className="text-primary text-sm leading-6 font-medium">{step.title}</p>
              <p className="text-secondary mt-0.5 text-[13px] leading-snug">{step.detail}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

/** "723 MB" / "1.2 GB" — a download size, not a precise byte count. */
function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '—'
  const mb = bytes / 1024 ** 2
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${String(Math.round(mb))} MB`
}
