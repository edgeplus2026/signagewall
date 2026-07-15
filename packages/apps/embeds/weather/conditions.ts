/**
 * WMO weather codes, made usable.
 *
 * Upstream hands us an integer. Two different questions get asked of it and they
 * want different granularity, so they get two functions:
 *
 *   - {@link conditionGroup} collapses 28 codes into the 8 kinds of weather that
 *     LOOK different on a screen. The sky, the icon and the ambience all key off
 *     this — a screen doesn't need a separate palette for "moderate drizzle" and
 *     "dense drizzle".
 *   - {@link conditionLabel} gives the human sentence, and here the granularity
 *     is the whole point: "Heavy snow" and "Light snow" are the same picture and
 *     very much not the same afternoon.
 */

export type ConditionGroup =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'thunder'

/** The kind of weather a code is, for everything that has to LOOK like it. */
export function conditionGroup(code: number): ConditionGroup {
  if (code === 0) return 'clear'
  if (code <= 2) return 'partly'
  if (code === 3) return 'cloudy'
  if (code <= 48) return 'fog'
  if (code <= 57) return 'drizzle'
  if (code <= 67) return 'rain'
  if (code <= 77) return 'snow'
  if (code <= 82) return 'rain' // 80-82: rain showers
  if (code <= 86) return 'snow' // 85-86: snow showers
  return 'thunder' // 95-99
}

/**
 * The label per code. Sparse on purpose — upstream only ever emits these — and
 * {@link conditionLabel} falls back to the group for anything unlisted rather
 * than printing a bare number at somebody.
 */
const LABELS: Record<string, Record<number, string>> = {
  en: {
    0: 'Clear',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Freezing fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    56: 'Freezing drizzle',
    57: 'Freezing drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    66: 'Freezing rain',
    67: 'Freezing rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    77: 'Snow grains',
    80: 'Light showers',
    81: 'Showers',
    82: 'Heavy showers',
    85: 'Light snow showers',
    86: 'Snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Severe thunderstorm',
  },
  sr: {
    0: 'Vedro',
    1: 'Pretežno vedro',
    2: 'Delimično oblačno',
    3: 'Oblačno',
    45: 'Magla',
    48: 'Ledena magla',
    51: 'Slaba rosulja',
    53: 'Rosulja',
    55: 'Jaka rosulja',
    56: 'Ledena rosulja',
    57: 'Ledena rosulja',
    61: 'Slaba kiša',
    63: 'Kiša',
    65: 'Jaka kiša',
    66: 'Ledena kiša',
    67: 'Ledena kiša',
    71: 'Slab sneg',
    73: 'Sneg',
    75: 'Jak sneg',
    77: 'Zrnasti sneg',
    80: 'Slabi pljuskovi',
    81: 'Pljuskovi',
    82: 'Jaki pljuskovi',
    85: 'Slabi snežni pljuskovi',
    86: 'Snežni pljuskovi',
    95: 'Grmljavina',
    96: 'Grmljavina s gradom',
    99: 'Jaka grmljavina s gradom',
  },
}

/** The group's name, for a code we don't have a specific sentence for. */
const GROUP_LABELS: Record<string, Record<ConditionGroup, string>> = {
  en: {
    clear: 'Clear',
    partly: 'Partly cloudy',
    cloudy: 'Cloudy',
    fog: 'Fog',
    drizzle: 'Drizzle',
    rain: 'Rain',
    snow: 'Snow',
    thunder: 'Thunderstorm',
  },
  sr: {
    clear: 'Vedro',
    partly: 'Delimično oblačno',
    cloudy: 'Oblačno',
    fog: 'Magla',
    drizzle: 'Rosulja',
    rain: 'Kiša',
    snow: 'Sneg',
    thunder: 'Grmljavina',
  },
}

/** What the weather is, in words, in the instance's language. */
export function conditionLabel(code: number, lang: string): string {
  const table = LABELS[lang] ?? LABELS.en
  const exact = table?.[code]
  if (exact !== undefined) {
    return exact
  }
  const groups = GROUP_LABELS[lang] ?? GROUP_LABELS.en
  return groups?.[conditionGroup(code)] ?? ''
}
