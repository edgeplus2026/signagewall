import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { PairingCodeInput } from '@/features/screens/components/PairingCodeInput'

interface PairingCodeFrameProps {
  code: string
  onChange: (value: string) => void
  onComplete?: ((value: string) => void) | undefined
  onSubmit: () => void
  isPending: boolean
}

/**
 * A wall-mounted digital-signage display whose panel holds the pairing-code
 * entry. Mirrors what the operator sees on the physical device: the code shown
 * there is typed back into these slots to bind the display to this screen. The
 * thin, uniform anodized bezel (no stand, no TV chrome) reads as a commercial
 * signage panel rather than a television.
 */
export function PairingCodeFrame({
  code,
  onChange,
  onComplete,
  onSubmit,
  isPending,
}: PairingCodeFrameProps) {
  const { t } = useTranslation()
  const canSubmit = code.trim().length === 6 && !isPending

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      {/* Device: thin uniform bezel, flush wall-mounted panel */}
      <div className="relative w-full max-w-lg rounded-2xl bg-linear-to-b from-neutral-800 to-neutral-950 p-2 shadow-[0_30px_70px_-25px_rgba(0,0,0,0.75)] ring-1 ring-white/10 sm:p-2.5">
        {/* machined bezel highlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/5"
        />

        {/* Glass panel: near-black with vignette + subtle content glow */}
        <div className="relative aspect-video overflow-hidden rounded-lg bg-[radial-gradient(120%_120%_at_50%_0%,#1c2230_0%,#0b0e14_55%,#05070b_100%)] ring-1 ring-black/60 ring-inset">
          {/* glass sheen */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-linear-to-br from-white/6 via-transparent to-transparent"
          />

          {/* sensor / status pinhole, top-center — a signage-device tell */}
          <span
            aria-hidden
            className="absolute top-2 left-1/2 size-1 -translate-x-1/2 rounded-full bg-white/15"
          />

          <div className="relative flex h-full flex-col items-center justify-center gap-4 px-4 py-5 text-center sm:gap-5">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-white/40 uppercase">
              {t('screens.device.code')}
            </p>

            <PairingCodeInput
              value={code}
              onChange={onChange}
              onComplete={onComplete}
              disabled={isPending}
              autoFocus
              theme="screen"
            />

            <p className="max-w-xs text-[13px] leading-snug text-white/45">
              {t('screens.device.codeHint')}
            </p>
          </div>
        </div>

        {/* Brand etched into the bottom bezel */}
        <div className="flex items-center justify-center pt-1.5 pb-0.5">
          <span className="text-[10px] font-semibold tracking-[0.3em] text-white/25 uppercase">
            Edge
          </span>
        </div>
      </div>

      <Button
        size="default"
        className="w-full max-w-lg"
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        {t('screens.device.pair.submit')}
      </Button>
    </div>
  )
}
