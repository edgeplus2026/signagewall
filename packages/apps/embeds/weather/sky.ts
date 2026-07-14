import type { ConditionGroup } from './conditions.js'

/**
 * The screen's palette — derived from the weather, not chosen by an operator.
 *
 * This is the app's one big idea. A weather screen whose background never changes
 * is a screen you stop seeing after a week; one that is blue on a clear afternoon,
 * slate under rain, and properly dark at night tells you the weather from across
 * the room, before you have read a single number. So there are no colour pickers
 * in the manifest, and there is no template that hard-codes a colour: `main.ts`
 * writes ONE sky onto the app root, and all ten layouts inherit it through
 * `currentColor` and the `--wx-*` custom properties.
 *
 * `isDay` comes from the payload, so it is daylight AT THE FORECAST PLACE — a
 * screen in a Belgrade lobby showing Sydney goes dark when the sun sets in Sydney.
 *
 * The operator can still overrule it with Light/Dark, and even then the ACCENT
 * still follows the weather: the screen stops repainting itself, but it does not
 * stop knowing that it is raining.
 */

export interface Sky {
  /** The full CSS `background` for the app root. */
  background: string
  text: string
  accent: string
  /** True when the field is dark enough to carry white text. */
  isDark: boolean
  /** The icon palette — see `icons.ts`, where every colour is one of these. */
  cloud: string
  cloudDark: string
  sun: string
  moon: string
  rain: string
  snow: string
  bolt: string
  haze: string
}

/**
 * The gradient stops per kind of weather. Day skies stay SATURATED and stop short
 * of near-white on purpose: they carry white display type, and a sky that fades
 * out to a pale wash is one that leaves a headline sitting on 2:1 contrast. The
 * light theme is where an operator goes for a white screen — a day sky is not it.
 */
const DAY_STOPS: Record<ConditionGroup, string> = {
  clear: '#0C5DBE 0%, #2E90DE 50%, #62B9EF 100%',
  partly: '#1E6BB8 0%, #4E97D4 52%, #86BEE4 100%',
  cloudy: '#48617A 0%, #6E869C 52%, #96A9BA 100%',
  fog: '#5E6B75 0%, #808D97 52%, #A3AEB6 100%',
  drizzle: '#3C5A73 0%, #5E7C94 52%, #85A0B4 100%',
  rain: '#28425C 0%, #45617C 52%, #66829C 100%',
  snow: '#4A6A86 0%, #7495B0 52%, #A6C3D6 100%',
  thunder: '#232B45 0%, #3B4463 52%, #5A5F82 100%',
}

const NIGHT_STOPS: Record<ConditionGroup, string> = {
  clear: '#060A1E 0%, #101B42 50%, #253566 100%',
  partly: '#080D22 0%, #16203F 52%, #2B3659 100%',
  cloudy: '#101426 0%, #212739 52%, #363E52 100%',
  fog: '#171B21 0%, #2A3038 52%, #414951 100%',
  drizzle: '#0D1620 0%, #1C2836 52%, #2E3E4C 100%',
  rain: '#0A121A 0%, #182430 52%, #283746 100%',
  snow: '#141D29 0%, #263443 52%, #3E5165 100%',
  thunder: '#070914 0%, #171A2E 52%, #2B2A44 100%',
}

/** The accent on a dark field: bright, and unmistakably the weather's colour. */
const DARK_ACCENT: Record<ConditionGroup, string> = {
  clear: '#FFC93C',
  partly: '#FFD166',
  cloudy: '#A8C4DC',
  fog: '#C3CED6',
  drizzle: '#7FD3F7',
  rain: '#4FC3F7',
  snow: '#BFE6FF',
  thunder: '#FFD54F',
}

/** The same accents, darkened until they hold up on white. */
const LIGHT_ACCENT: Record<ConditionGroup, string> = {
  clear: '#E08A00',
  partly: '#D08A0A',
  cloudy: '#4E6E8C',
  fog: '#5F6E7A',
  drizzle: '#1C8FC7',
  rain: '#0B7FBF',
  snow: '#3F87B0',
  thunder: '#B37F00',
}

/** A clear night wants its own accent — moonlight is not sunlight. */
const NIGHT_CLEAR_ACCENT = '#8AB4FF'

/**
 * Two soft washes over the gradient, so a flat CSS gradient reads as a sky with
 * depth in it rather than as a colour ramp. Sized in `vw`/`vh` so they scale with
 * the screen instead of pinning to a pixel size nobody chose.
 */
function backdrop(stops: string, isDark: boolean): string {
  const wash = isDark ? 0.09 : 0.2
  return (
    `radial-gradient(62vw 46vw at 78% 4%, rgba(255,255,255,${wash}), transparent 62%),` +
    `radial-gradient(54vw 40vw at 4% 98%, rgba(255,255,255,${wash * 0.65}), transparent 60%),` +
    `linear-gradient(165deg, ${stops})`
  )
}

/** The icon colours that work on any of the auto skies (all of which are dark). */
const DARK_ICONS = {
  cloud: '#FFFFFF',
  cloudDark: '#C4D0DA',
  sun: '#FFC93C',
  moon: '#E8EEF9',
  rain: '#7FD3F7',
  snow: '#E1F5FE',
  bolt: '#FFD54F',
  haze: '#ECEFF1',
} as const

/**
 * On white, a white cloud is not a cloud — it is nothing at all. The light theme
 * needs its own icon palette, and this is the one thing that is genuinely easy to
 * ship broken, because the app is usually being looked at against a dark sky while
 * it is being built.
 */
const LIGHT_ICONS = {
  cloud: '#CBD9E5',
  cloudDark: '#9DB2C4',
  sun: '#F2A413',
  moon: '#7D8FA6',
  rain: '#2196D6',
  snow: '#8FC9E8',
  bolt: '#E8A317',
  haze: '#B7C4CE',
} as const

/**
 * The sky for the weather on screen.
 *
 * `theme` is the operator's setting: `auto` (the default — the screen follows the
 * sky), or `light` / `dark` to pin it. `isDay` is daylight at the forecast place.
 */
export function resolveSky(
  theme: unknown,
  group: ConditionGroup,
  isDay: boolean,
): Sky {
  if (theme === 'light') {
    return {
      // Not flat white: the faintest breath of the accent, so a light screen still
      // looks like it belongs to the weather rather than to a spreadsheet.
      background: `radial-gradient(70vw 50vw at 82% 0%, ${LIGHT_ACCENT[group]}14, transparent 60%), #FFFFFF`,
      text: '#0F172A',
      accent: LIGHT_ACCENT[group],
      isDark: false,
      ...LIGHT_ICONS,
    }
  }

  if (theme === 'dark') {
    return {
      background: `radial-gradient(70vw 50vw at 82% 0%, ${DARK_ACCENT[group]}1F, transparent 60%), #0B1220`,
      text: '#FFFFFF',
      accent: DARK_ACCENT[group],
      isDark: true,
      ...DARK_ICONS,
    }
  }

  // Auto: the sky itself.
  const stops = isDay ? DAY_STOPS[group] : NIGHT_STOPS[group]
  const accent =
    !isDay && group === 'clear' ? NIGHT_CLEAR_ACCENT : DARK_ACCENT[group]

  return {
    background: backdrop(stops, !isDay),
    text: '#FFFFFF',
    accent,
    isDark: true,
    ...DARK_ICONS,
  }
}
