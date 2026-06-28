import { ScreenShare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PLAYER_URL } from '@/features/screens/lib/playerPreviewUrl'

interface OpenWebPlayerButtonProps {
  className?: string
}

/**
 * Opens the regular web player in a new tab — the bare player app, which shows
 * a pairing code (or whatever it's already bound to). No screen/preview params:
 * a device pairs 1:1 with a screen through the normal pairing flow.
 */
export function OpenWebPlayerButton({ className }: OpenWebPlayerButtonProps) {
  const { t } = useTranslation()

  return (
    <Button
      variant="secondary"
      size="sm"
      className={className}
      onClick={() => {
        window.open(PLAYER_URL, '_blank', 'noopener,noreferrer')
      }}
    >
      <ScreenShare className="size-4" />
      {t('screens.device.preview.openWebPlayer')}
    </Button>
  )
}
