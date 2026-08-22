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

/**
 * How to get the player onto a screen, and what the TV will ask along the way.
 *
 * Shown in two places on purpose: on the download page, and directly under the
 * pairing code on a screen that has no device yet — which is the exact moment
 * somebody is standing in front of a blank TV wondering what to do next. Walking
 * them through it there saves the phone call the first customer would otherwise
 * make.
 *
 * Every step below was walked on a real Android TV rather than written from the
 * documentation, including the one nobody expects: Android refuses the install
 * until the app that opened the file — the browser, or the file manager — is
 * allowed to install unknown apps, and it sends you to a settings screen to say so.
 */
export function PlayerInstallInstructions({ webPlayerUrl }: PlayerInstallInstructionsProps) {
  const { t } = useTranslation()
  const { data: release, isLoading } = useAndroidRelease()

  const steps = t('downloads.android.steps', {
    returnObjects: true,
  }) as string[]

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

        {/* Numbered rather than prose: somebody is reading this with a remote in
            one hand, next to a TV, and needs to know which step they are on. */}
        <div className="flex flex-col gap-3 px-4 py-3">
          <ol className="text-secondary flex flex-col gap-2 text-[13px] leading-snug">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="text-muted-foreground shrink-0 font-mono text-xs">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
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

/** "723 MB" / "1.2 GB" — a download size, not a precise byte count. */
function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined) return '—'
  const mb = bytes / 1024 ** 2
  return mb >= 1024
    ? `${(mb / 1024).toFixed(1)} GB`
    : `${String(Math.round(mb))} MB`
}
