import { ScreenShare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  buildPlayerDeviceUrl,
  PLAYER_URL,
} from '@/features/screens/lib/playerPreviewUrl'

interface OpenWebPlayerButtonProps {
  className?: string
  /**
   * `deviceId` of the paired device, when the screen is paired. Passed so the
   * opened player carries `?device=<uuid>` and can recover this exact device if
   * its localStorage was wiped. Omitted for an unpaired screen, which opens the
   * bare player and pairs through the normal code flow.
   */
  deviceId?: string | undefined
}

/**
 * Opens the regular web player in a new tab. For a paired screen it carries the
 * device's `deviceId` (`?device=<uuid>`) so the player re-adopts that identity
 * and slides back into this screen even if its storage was cleared. For an
 * unpaired screen it opens the bare player, which shows a fresh pairing code.
 */
export function OpenWebPlayerButton({
  className,
  deviceId,
}: OpenWebPlayerButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={() => {
        const url = deviceId ? buildPlayerDeviceUrl(deviceId) : PLAYER_URL
        window.open(url, '_blank', 'noopener,noreferrer')
      }}
    >
      <ScreenShare className="size-4" />
      {t('screens.device.preview.openWebPlayer')}
    </Button>
  )
}
