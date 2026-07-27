import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'EdgeRize'

interface Props {
  params: Promise<{ locale: string }>
}

/* The pixel-grid "R", drawn straight onto the dark card — no tile, so the mark
   reads at thumbnail size. Cells are the 48-unit brand grid scaled ×1.5. */
const SCALE = 1.5
const CELL = 6 * SCALE
const PIXELS: { x: number; y: number; red?: boolean }[] = [
  // stem
  ...[5, 13, 21, 29, 37].map((y) => ({ x: 5, y })),
  // bowl
  { x: 13, y: 5 },
  { x: 21, y: 5 },
  { x: 29, y: 5 },
  { x: 37, y: 13 },
  { x: 13, y: 21 },
  { x: 21, y: 21 },
  { x: 29, y: 21 },
  // kick
  { x: 29, y: 29, red: true },
  { x: 37, y: 37, red: true },
]

export default async function OpengraphImage({ params }: Props) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home.hero' })

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        background: '#141414',
        color: '#fcfcfc',
        padding: '80px',
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <div
          style={{ position: 'relative', width: 48 * SCALE, height: 48 * SCALE, display: 'flex' }}
        >
          {PIXELS.map((p) => (
            <div
              key={`${p.x.toString()}-${p.y.toString()}`}
              style={{
                position: 'absolute',
                left: p.x * SCALE,
                top: p.y * SCALE,
                width: CELL,
                height: CELL,
                borderRadius: 2,
                background: p.red ? '#cc0000' : '#fcfcfc',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>EdgeRize</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>
          {t('title')}
        </div>
        <div style={{ fontSize: 30, color: 'rgba(228,228,228,0.7)' }}>{t('eyebrow')}</div>
      </div>
    </div>,
    { ...size },
  )
}
