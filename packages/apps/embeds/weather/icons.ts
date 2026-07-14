import { type ConditionGroup, conditionGroup } from './conditions.js'

/**
 * The weather icons — one 64×64 SVG per kind of weather, day and night.
 *
 * Two things here are load-bearing and neither is obvious:
 *
 * NIGHT IS A REAL CASE, NOT A TINT. A clear night gets a moon, not a dimmed sun.
 * The app knows whether the sun is up AT THE FORECAST PLACE (`payload.isDay`), and
 * a screen showing a blazing sun at two in the morning is the single most visible
 * way a weather app can look broken.
 *
 * THE CLOUDS ARE NOT WHITE. They are `var(--wx-cloud)`, set by the sky. A white
 * cloud is right on a blue sky and completely invisible on the light theme, which
 * is exactly the bug you get from hard-coding `#fff` and only ever testing at
 * night. Every colour in here comes from a custom property with a sane fallback,
 * so the icons stay legible on whatever the sky (or the operator) chose.
 *
 * The `wx-ic-*` classes are animation hooks; the motion itself lives in
 * `style.css`, where it can be paused off-screen and dropped entirely for anyone
 * who asked for reduced motion.
 */

const SUN = 'var(--wx-sun, #FFC93C)'
const MOON = 'var(--wx-moon, #E8EEF9)'
const CLOUD = 'var(--wx-cloud, #FFFFFF)'
const CLOUD_DARK = 'var(--wx-cloud-dark, #CFD8DC)'
const RAIN = 'var(--wx-rain, #4FC3F7)'
const SNOW = 'var(--wx-snow, #E1F5FE)'
const BOLT = 'var(--wx-bolt, #FFD54F)'
const HAZE = 'var(--wx-haze, #ECEFF1)'

/** Eight rays around a centre. */
function rays(cx: number, cy: number, inner: number, outer: number): string {
  const lines = [0, 45, 90, 135, 180, 225, 270, 315]
    .map((deg) => {
      const angle = (deg * Math.PI) / 180
      const x1 = (cx + Math.cos(angle) * inner).toFixed(1)
      const y1 = (cy + Math.sin(angle) * inner).toFixed(1)
      const x2 = (cx + Math.cos(angle) * outer).toFixed(1)
      const y2 = (cy + Math.sin(angle) * outer).toFixed(1)
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`
    })
    .join('')
  // Rotating the rays about their own centre — hence the explicit origin, which
  // an SVG child does not get for free.
  return `<g class="wx-ic-rays" style="transform-origin:${cx}px ${cy}px" stroke="${SUN}" stroke-width="4" stroke-linecap="round">${lines}</g>`
}

function sun(cx: number, cy: number, r: number): string {
  return `${rays(cx, cy, r + 4, r + 11)}<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>`
}

/**
 * A crescent — ONE closed path made of two arcs, not two circles subtracted.
 *
 * Subtracting a disc from a disc with `fill-rule: evenodd` is the obvious way to do
 * this and it does not work, because the cutting disc is not contained in the one it
 * cuts: the part of it that hangs outside the moon is covered by exactly one path, so
 * even-odd FILLS it. The result was a crescent with a second disc bulging off its
 * right-hand side — on a night sky it read as two overlapping moons, which is exactly
 * as odd as it sounds. (Containing the cutting disc entirely doesn't rescue it either;
 * that gives a closed ring, not a crescent with horns.)
 *
 * So the lune is drawn directly. The two circles — the moon (radius `r`) and the
 * shadow (radius `SHADOW_R`, centred `SHADOW_D` to the right) — meet at two points,
 * and those points are the crescent's horns. The outline is then: the long way round
 * the moon's rim from one horn to the other, and back along the shadow's rim. The
 * geometry below is that intersection, solved once rather than eyeballed.
 */
const SHADOW_R = 0.95
const SHADOW_D = 0.55
/** Where the two rims cross, as a fraction of `r`. From x = (d² + R² − r²) / 2d. */
const HORN_X = (SHADOW_D ** 2 + 1 - SHADOW_R ** 2) / (2 * SHADOW_D)
const HORN_Y = Math.sqrt(1 - HORN_X ** 2)

function moon(cx: number, cy: number, r: number): string {
  const x = (cx + HORN_X * r).toFixed(2)
  const top = (cy - HORN_Y * r).toFixed(2)
  const bottom = (cy + HORN_Y * r).toFixed(2)
  const shadow = (SHADOW_R * r).toFixed(2)

  return (
    `<path class="wx-ic-moon" fill="${MOON}" d="` +
    `M ${x} ${top} ` +
    // The moon's rim, the long way round the left (large-arc, anticlockwise).
    `A ${r} ${r} 0 1 0 ${x} ${bottom} ` +
    // The shadow's rim, back to the other horn (minor arc, clockwise).
    `A ${shadow} ${shadow} 0 0 1 ${x} ${top} Z" />`
  )
}

function stars(): string {
  return (
    `<g fill="${MOON}" class="wx-ic-stars">` +
    `<circle cx="15" cy="16" r="1.6"/>` +
    `<circle cx="52" cy="14" r="2"/>` +
    `<circle cx="44" cy="26" r="1.3"/>` +
    `</g>`
  )
}

function cloud(color: string, offsetY = 0): string {
  return (
    `<g class="wx-ic-cloud" fill="${color}" transform="translate(0 ${offsetY})">` +
    `<circle cx="24" cy="40" r="10"/><circle cx="40" cy="37" r="13"/>` +
    `<circle cx="50" cy="43" r="9"/><rect x="18" y="42" width="38" height="12" rx="6"/>` +
    `</g>`
  )
}

/** Falling strokes — rain and drizzle differ only in how many and how hard. */
function drops(count: number, opacity: number): string {
  const xs = count === 2 ? [30, 42] : [26, 36, 46]
  const lines = xs
    .map(
      (x, i) =>
        `<line class="wx-ic-drop" style="animation-delay:${i * 180}ms" x1="${x}" y1="55" x2="${x - 3}" y2="61"/>`,
    )
    .join('')
  return `<g stroke="${RAIN}" stroke-width="4" stroke-linecap="round" opacity="${opacity}">${lines}</g>`
}

function flakes(): string {
  return (
    `<g fill="${SNOW}">` +
    [26, 36, 46]
      .map(
        (x, i) =>
          `<circle class="wx-ic-flake" style="animation-delay:${i * 260}ms" cx="${x}" cy="${i === 1 ? 59 : 57}" r="2.6"/>`,
      )
      .join('') +
    `</g>`
  )
}

function bolt(): string {
  return `<path class="wx-ic-bolt" d="M35 51 L29 60 L34 60 L31 66 L43 57 L36 57 L40 51 Z" fill="${BOLT}"/>`
}

function haze(): string {
  return (
    `<g stroke="${HAZE}" stroke-width="4" stroke-linecap="round">` +
    `<line class="wx-ic-haze" x1="20" y1="56" x2="44" y2="56"/>` +
    `<line class="wx-ic-haze" style="animation-delay:600ms" x1="24" y1="63" x2="48" y2="63"/>` +
    `</g>`
  )
}

/** The artwork for a kind of weather. */
function iconBody(group: ConditionGroup, isDay: boolean): string {
  switch (group) {
    case 'clear':
      return isDay ? sun(32, 32, 14) : `${stars()}${moon(34, 32, 15)}`
    case 'partly':
      return isDay
        ? `${sun(44, 22, 10)}${cloud(CLOUD)}`
        : `${stars()}${moon(45, 22, 11)}${cloud(CLOUD)}`
    case 'cloudy':
      // Two clouds, the back one darker: overcast has no single silhouette, and a
      // lone flat cloud reads as "partly" without the sun to say otherwise.
      return `<g opacity="0.55">${cloud(CLOUD_DARK, -8)}</g>${cloud(CLOUD, 4)}`
    case 'fog':
      return `${cloud(CLOUD_DARK, -4)}${haze()}`
    case 'drizzle':
      return `${cloud(CLOUD)}${drops(2, 0.75)}`
    case 'rain':
      return `${cloud(CLOUD)}${drops(3, 1)}`
    case 'snow':
      return `${cloud(CLOUD)}${flakes()}`
    case 'thunder':
      return `${cloud(CLOUD_DARK)}${bolt()}`
  }
}

/**
 * The icon for a WMO code. `isDay` defaults to daytime — a payload cached before
 * the connector knew about daylight has no `isDay`, and the sun is the safer
 * guess for a screen that is, after all, usually watched during the day.
 */
export function weatherIcon(code: number, isDay = true): string {
  return (
    `<svg viewBox="0 0 64 64" class="wx-svg" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
    `${iconBody(conditionGroup(code), isDay)}</svg>`
  )
}
