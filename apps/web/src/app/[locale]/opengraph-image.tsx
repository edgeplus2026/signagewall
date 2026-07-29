import { ImageResponse } from 'next/og'
import { getTranslations } from 'next-intl/server'

export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = 'SignageWall'

interface Props {
  params: Promise<{ locale: string }>
}

/* The coral accent, matching `--accent` and the favicon. This was #cc0000, a
   pure red left over from before the palette moved to coral — on a share card
   sitting next to the favicon, the two reading as different brands is the whole
   problem. Hard-coded because Satori resolves no CSS variables. */
const ACCENT = '#d85a30'

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
  /* Site-level copy, not `home.hero`. This file sits at the [locale] segment,
     so every page under it inherits this one image — with the hero's copy it
     announced "change what's on your screens in 30 seconds" on /contact, /about
     and the legal pages alike. The site title and description are true of all
     of them. Routes that deserve their own card (blog posts) set one. */
  const t = await getTranslations({ locale, namespace: 'meta' })

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
                background: p.red ? ACCENT : '#fcfcfc',
              }}
            />
          ))}
        </div>
        <div style={{ fontSize: 42, fontWeight: 700, letterSpacing: -1 }}>SignageWall</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 600, letterSpacing: -2, lineHeight: 1.05 }}>
          {t('ogTitle')}
        </div>
        <div style={{ fontSize: 30, color: 'rgba(228,228,228,0.7)' }}>{t('ogSubtitle')}</div>
      </div>
    </div>,
    { ...size },
  )
}
