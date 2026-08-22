import { useTranslation } from 'react-i18next'

import { PlayerInstallInstructions } from '@/features/downloads/components/PlayerInstallInstructions'

const PLAYER_URL = import.meta.env.VITE_PLAYER_URL

/**
 * Everything needed to put SignageWall on a screen, in one place.
 *
 * Exists because the answer used to live in a conversation: a customer bought the
 * software and then asked, by phone, how the file gets onto their television. The
 * page is deliberately not clever — a current build, the steps in order, and the
 * one setting Android will demand along the way.
 */
export default function DownloadPage() {
  const { t } = useTranslation()

  return (
    <div className="flex w-full min-w-0 flex-col gap-7 pb-6 lg:px-10">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-primary text-xl font-medium tracking-tight">{t('downloads.title')}</h1>
        <p className="text-secondary text-sm">{t('downloads.description')}</p>
      </div>

      <PlayerInstallInstructions webPlayerUrl={PLAYER_URL} />
    </div>
  )
}
