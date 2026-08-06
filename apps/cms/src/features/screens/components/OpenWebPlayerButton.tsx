import { ScreenShare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { screensApi } from '@/features/screens/api/screensApi'
import {
  buildPlayerRecoveryUrl,
  PLAYER_URL,
} from '@/features/screens/lib/playerPreviewUrl'
import { getApiErrorMessage } from '@/lib/api-error'

interface OpenWebPlayerButtonProps {
  className?: string
  /** Screen whose paired device the opened player should recover into. */
  screenId: string
  /**
   * Whether the screen currently has a paired device. Paired screens get a
   * one-time recovery grant minted server-side; unpaired screens open the bare
   * player, which pairs through the normal code flow.
   */
  paired: boolean
}

/**
 * Opens the regular web player in a new tab. For a paired screen it first
 * mints a single-use recovery grant (`?device=<uuid>&recovery=<code>`) so the
 * opened player is admitted as that device — a bare `deviceId` is deliberately
 * not a credential, so the link is safe even if it later leaks from history.
 */
export function OpenWebPlayerButton({
  className,
  screenId,
  paired,
}: OpenWebPlayerButtonProps) {
  const { t } = useTranslation()
  const [isMinting, setIsMinting] = useState(false)

  const openWebPlayer = async () => {
    if (!paired) {
      window.open(PLAYER_URL, '_blank', 'noopener,noreferrer')
      return
    }

    // Open the tab synchronously inside the click gesture — popup blockers
    // refuse a window.open that happens only after the awaited API call — and
    // navigate it once the grant arrives. `noopener` would return null, so the
    // opener is severed by hand instead.
    const tab = window.open('about:blank', '_blank')
    if (tab) {
      tab.opener = null
    }

    setIsMinting(true)
    try {
      const link = await screensApi.createDeviceRecoveryLink(screenId)
      const url = buildPlayerRecoveryUrl(link)
      if (tab) {
        tab.location.replace(url)
      } else {
        window.open(url, '_blank', 'noopener,noreferrer')
      }
    } catch (error) {
      tab?.close()
      toast.error(
        getApiErrorMessage(error, t('screens.device.preview.openWebPlayerError')),
      )
    } finally {
      setIsMinting(false)
    }
  }

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      disabled={isMinting}
      onClick={() => {
        void openWebPlayer()
      }}
    >
      <ScreenShare className="size-4" />
      {t('screens.device.preview.openWebPlayer')}
    </Button>
  )
}
