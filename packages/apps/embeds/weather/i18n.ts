/**
 * The words the layouts put on a wall, in the instance's language.
 *
 * Only the STATIC words live here. Anything that depends on a value — day names,
 * hours, relative times — comes from `Intl` against {@link localeOf}, because a
 * hand-rolled day-name table is a bug the day somebody adds a third language.
 */

export interface Strings {
  /** Reads as "Now in Belgrade" — the preposition is baked in per language. */
  nowIn: string
  now: string
  feelsLike: string
  humidity: string
  wind: string
  precipitation: string
  /** The short form, for a tile that has no room for the long one. */
  rainChance: string
  uv: string
  sunrise: string
  sunset: string
  daylight: string
  daylightLeft: string
  today: string
  tonight: string
  hourByHour: string
  theWeek: string
  forecast: string
  loading: string
  /** Compass points, north first, clockwise. Indexed by {@link compassPoint}. */
  compass: readonly string[]
}

const EN: Strings = {
  nowIn: 'Now in',
  now: 'Now',
  feelsLike: 'Feels like',
  humidity: 'Humidity',
  wind: 'Wind',
  precipitation: 'Precipitation',
  rainChance: 'Rain',
  uv: 'UV index',
  sunrise: 'Sunrise',
  sunset: 'Sunset',
  daylight: 'Daylight',
  daylightLeft: 'of daylight left',
  today: 'Today',
  tonight: 'Tonight',
  hourByHour: 'Hour by hour',
  theWeek: 'The week ahead',
  forecast: 'Forecast',
  loading: 'Loading weather…',
  compass: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'],
}

const SR: Strings = {
  nowIn: 'Trenutno u',
  now: 'Sada',
  feelsLike: 'Oseća se kao',
  humidity: 'Vlažnost',
  wind: 'Vetar',
  precipitation: 'Padavine',
  rainChance: 'Kiša',
  uv: 'UV indeks',
  sunrise: 'Izlazak sunca',
  sunset: 'Zalazak sunca',
  daylight: 'Dnevno svetlo',
  daylightLeft: 'dnevnog svetla još',
  today: 'Danas',
  tonight: 'Večeras',
  hourByHour: 'Po satima',
  theWeek: 'Nedelja pred nama',
  forecast: 'Prognoza',
  loading: 'Učitavanje vremena…',
  compass: ['S', 'SI', 'I', 'JI', 'J', 'JZ', 'Z', 'SZ'],
}

const STRINGS: Record<string, Strings> = { en: EN, sr: SR }

/** The language the config asked for, narrowed to one we ship. */
export function langOf(config: Record<string, unknown>): string {
  return config.language === 'sr' ? 'sr' : 'en'
}

/** The strings for a language, English for anything we don't ship. */
export function stringsOf(lang: string): Strings {
  return STRINGS[lang] ?? EN
}

/**
 * The `Intl` locale for a language. Serbian resolves to the LATIN script
 * explicitly: `sr` alone gives Cyrillic day names on most runtimes, and a screen
 * whose config says "Serbian" is not asking to change alphabet.
 */
export function localeOf(lang: string): string {
  return lang === 'sr' ? 'sr-Latn' : 'en'
}
