import { ScreenShare } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useIsSuperAdmin } from '@/features/auth/hooks/useIsSuperAdmin'
import { screensApi } from '@/features/screens/api/screensApi'
import { buildPlayerRecoveryUrl, PLAYER_URL } from '@/features/screens/lib/playerPreviewUrl'
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
  /**
   * Whether that paired device is currently reporting in. Redeeming a recovery
   * grant rotates the device token, so opening the web player TAKES OVER the
   * identity — a live display is signed out and drops to a pairing code. That
   * is fine for a dead screen (it is the recovery path) and destructive for a
   * healthy one, so the healthy case asks first.
   */
  deviceOnline?: boolean
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
  deviceOnline = false,
}: OpenWebPlayerButtonProps) {
  const { t } = useTranslation()
  const isSuperAdmin = useIsSuperAdmin()
  const [isMinting, setIsMinting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)

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
      toast.error(getApiErrorMessage(error, t('screens.device.preview.openWebPlayerError')))
    } finally {
      setIsMinting(false)
    }
  }

  const handleClick = () => {
    if (paired && deviceOnline) {
      setConfirmOpen(true)
      return
    }
    void openWebPlayer()
  }

  // A recovery instrument, not a customer control: opening the player here mints a
  // single-use grant and SIGNS THE LIVE DISPLAY OUT, so one confirm click takes a
  // working shop screen down. Gated inside the component rather than at the call
  // site, matching the rest of this feature, so a new call site cannot forget it.
  if (!isSuperAdmin) {
    return null
  }

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className={className}
        disabled={isMinting}
        onClick={handleClick}
      >
        <ScreenShare className="size-4" />
        {t('screens.device.preview.openWebPlayer')}
      </Button>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{t('screens.device.preview.takeoverTitle')}</DialogTitle>
            <DialogDescription>{t('screens.device.preview.takeoverDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmOpen(false)
              }}
            >
              {t('screens.device.preview.takeoverCancel')}
            </Button>
            <Button
              variant="danger"
              disabled={isMinting}
              onClick={() => {
                setConfirmOpen(false)
                void openWebPlayer()
              }}
            >
              {t('screens.device.preview.takeoverConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
