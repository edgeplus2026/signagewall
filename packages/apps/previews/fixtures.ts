import { CLOCK_FACES } from '../src/clock/faces.js'
import { MENU_TEMPLATES } from '../src/menu/templates.js'
import { RSS_DISPLAY_MODES } from '../src/rss/display-modes.js'
import { WEATHER_DISPLAY_MODES } from '../src/weather/display-modes.js'

/**
 * The sample content the template thumbnails are rendered from.
 *
 * One entry per `Field.previewGallery` namespace. The generator
 * (`scripts/build-previews.mts`) drives the real embed bundle once per option
 * value with this config and payload, screenshots it at 1920×1080 and writes
 * `previews/<namespace>/<value>.webp`.
 *
 * `values` is DERIVED from the same `as const` arrays the manifests offer, so a
 * newly added template automatically gets an image on the next run — the list
 * cannot drift from the options the operator actually sees.
 *
 * Write content the way a customer would: real prices, real category names,
 * long-enough strings to stress the layouts (a two-line item name, a full
 * headline). A fixture of "Item 1 / Item 2" produces thumbnails that make every
 * design look the same, which defeats the point of showing them at all.
 */

export type PreviewNamespace =
  | 'clock'
  | 'menu'
  | 'weather'
  | 'rss'
  | 'social'
  | 'calendar'

export interface PreviewFixture {
  /** The app slug whose bundle renders this namespace. */
  slug: string
  /** The config key the gallery selects; each value becomes one image. */
  field: string
  /** Every option value needing an image. Derive it — never hand-list it. */
  values: readonly string[]
  /**
   * Config overlaid on `buildDefaultConfig(manifest.configSchema)`, so only the
   * fields that matter for the picture are named here.
   */
  config: Record<string, unknown>
  /**
   * Per-option config on top of {@link config}, for a design whose content brief
   * genuinely differs — a tasting-menu board shown a ten-item canteen list
   * renders a truthful picture of the wrong thing. Nothing needs one today. Use
   * sparingly: an override that exists to dodge a layout bug hides the bug
   * instead of fixing it.
   */
  overrides?: Record<string, Record<string, unknown>>
  /** The connector payload; `null` for `static` apps, which have none. */
  data: unknown
}

/**
 * The fictional venue every fixture shares, so the thumbnails read as one demo
 * brand rather than five unrelated ones.
 *
 * English, and deliberately placeless: these images are the first thing a
 * prospect sees of the product, and localized sample content (a Serbian café
 * name, dinar prices, Cyrillic) reads as "built for somewhere else" to everyone
 * outside that market — which is most of it.
 */
const DEMO_VENUE = 'Harbour & Vine'

/**
 * Weekday-bearing content is pinned to a fixed date so a re-run does not churn
 * the committed images. Relative content ("2 hours ago") is not — see
 * {@link hoursAgo}.
 */
const TODAY = '2026-06-18'
const OBSERVED_AT = `${TODAY}T14:00:00Z`

function isoDate(dayOffset: number): string {
  const base = Date.parse(`${TODAY}T00:00:00Z`)
  return new Date(base + dayOffset * 86_400_000).toISOString().slice(0, 10)
}

function isoHour(hourOffset: number): string {
  const base = Date.parse(`${TODAY}T14:00:00Z`)
  return new Date(base + hourOffset * 3_600_000).toISOString().slice(0, 16)
}

/**
 * Relative to the actual run, because the RSS templates print an age. Pinned to
 * a fixed date these read "59 days ago" — which makes every news layout look
 * like it is showing a dead feed.
 */
function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3_600_000).toISOString()
}

/**
 * An ISO time today, at a given local hour. The calendar views are anchored to
 * the real current date — a fixed fixture date would leave the day view empty
 * and the month grid showing a month with nothing in it.
 */
function todayAt(hour: number, minute = 0): string {
  const when = new Date()
  when.setHours(hour, minute, 0, 0)
  return when.toISOString()
}

/**
 * An ISO time on a weekday of the CURRENT week (0 = Monday), at a local hour.
 *
 * Anchored to the week rather than offset from today, because the week view
 * renders a fixed Mon–Sun window: `today ± 3 days` spills half the events into
 * the neighbouring weeks, and how many survive depends on which weekday the
 * generator happened to run — a fixture that renders a different picture on a
 * Monday than on a Friday.
 */
function onWeekdayAt(weekday: number, hour: number, minute = 0): string {
  const when = new Date()
  // getDay(): 0 = Sunday. Shift so Monday starts the week.
  const mondayOffset = (when.getDay() + 6) % 7
  when.setDate(when.getDate() - mondayOffset + weekday)
  when.setHours(hour, minute, 0, 0)
  return when.toISOString()
}

/**
 * Builds the fixture table. Takes the origin of the generator's throwaway static
 * server because image URLs must be absolute `http(s):` to survive the embeds'
 * scheme guards (`menu/format.ts` `imageSrc`), and the port is only known at run
 * time. Placeholder art is generated into `/_assets/` by the script itself.
 */
export function buildFixtures(assetOrigin: string): Record<PreviewNamespace, PreviewFixture> {
  const asset = (name: string): string => `${assetOrigin}/_assets/${name}.jpg`

  return {
    clock: {
      slug: 'clock',
      field: 'face',
      values: CLOCK_FACES.map((face) => face.value),
      config: {
        theme: 'dark',
        format: '24h',
        showSeconds: true,
        showDate: true,
      },
      data: null,
    },

    menu: {
      slug: 'menu',
      field: 'template',
      values: MENU_TEMPLATES.map((template) => template.value),
      config: {
        heading: DEMO_VENUE,
        currency: 'EUR',
        source: 'manual',
        // TWO categories, ten items, a picture on every one.
        //
        // Two and not three on purpose: `classic` and `chalkboard` lay their
        // groups out in a `column-count: 2` block with `break-inside: avoid`, so
        // a third unbreakable group has nowhere to go — classic drops it
        // silently and chalkboard spills it outside the board frame. Ten items
        // over two categories is an ordinary café board AND the shape both
        // two-column designs render correctly. (The clipping itself is a real
        // menu-board bug; it is not this fixture's job to hide it.)
        //
        // Every item carries a picture because `counter` puts a thumbnail on
        // every row — a board where half of them fall back to a monogram shows
        // the fallback rather than the design.
        items: [
          { name: 'Espresso', price: 3.2, description: 'Double shot, house blend', category: 'Coffee', imageUrl: asset('coffee') },
          { name: 'Cappuccino', price: 4.1, description: 'Oat milk on request', category: 'Coffee', imageUrl: asset('cappuccino') },
          { name: 'Flat White', price: 4.3, description: 'Silky microfoam, single origin', category: 'Coffee', imageUrl: asset('flatwhite') },
          { name: 'Cold Brew', price: 4.6, description: 'Steeped 18 hours, over ice', category: 'Coffee', imageUrl: asset('coldbrew') },
          { name: 'Fresh Lemonade', price: 4.8, description: 'Lemon, mint, still or sparkling', category: 'Coffee', imageUrl: asset('lemonade') },
          { name: 'Truffle Mushroom Toast', price: 12.5, description: 'Sourdough, poached egg, chives', category: 'Kitchen', imageUrl: asset('toast') },
          { name: 'Buttermilk Fried Chicken', price: 17.9, description: 'Slaw, pickles, brioche bun', category: 'Kitchen', imageUrl: asset('chicken') },
          { name: 'Roasted Beet Salad', price: 11.4, description: 'Goat cheese, walnut, honey', category: 'Kitchen', imageUrl: asset('salad') },
          { name: 'Steak Frites', price: 24.5, description: 'Ribeye, peppercorn sauce', category: 'Kitchen', imageUrl: asset('steak') },
          { name: 'Lemon Ricotta Pancakes', price: 10.9, description: 'Blueberry compote, maple', category: 'Kitchen', imageUrl: asset('pancakes') },
        ],
      },
      data: null,
    },

    weather: {
      slug: 'weather',
      field: 'displayMode',
      values: WEATHER_DISPLAY_MODES.map((mode) => mode.value),
      config: {
        location: { label: 'Copenhagen', lat: 55.6761, lng: 12.5683 },
        theme: 'dark',
        units: 'metric',
        language: 'en',
        showClock: true,
      },
      data: {
        location: 'Copenhagen',
        temperatureC: 21,
        weatherCode: 2,
        windKph: 14,
        humidity: 48,
        precipitationProbability: 15,
        observedAt: OBSERVED_AT,
        isDay: true,
        feelsLikeC: 22,
        windDegrees: 315,
        daily: [
          { date: isoDate(0), minC: 13, maxC: 22, weatherCode: 2, precipitationProbability: 15, uvIndexMax: 5, sunrise: `${isoDate(0)}T04:31`, sunset: `${isoDate(0)}T21:56` },
          { date: isoDate(1), minC: 14, maxC: 24, weatherCode: 1, precipitationProbability: 5, uvIndexMax: 6 },
          { date: isoDate(2), minC: 15, maxC: 26, weatherCode: 0, precipitationProbability: 0, uvIndexMax: 6 },
          { date: isoDate(3), minC: 15, maxC: 23, weatherCode: 61, precipitationProbability: 55, uvIndexMax: 4 },
          { date: isoDate(4), minC: 12, maxC: 18, weatherCode: 80, precipitationProbability: 70, uvIndexMax: 3 },
          { date: isoDate(5), minC: 13, maxC: 20, weatherCode: 3, precipitationProbability: 25, uvIndexMax: 4 },
        ],
        hourly: Array.from({ length: 24 }, (_, i) => ({
          time: isoHour(i),
          // A gentle afternoon peak then an overnight dip — a flat series makes
          // the `hourly` curve and the `tiles` sparkline look broken.
          temperatureC: Math.round(21 + 4 * Math.sin(((i + 2) / 24) * Math.PI * 2)),
          weatherCode: i < 6 ? 2 : i < 14 ? 1 : 61,
          precipitationProbability: i < 6 ? 15 : i < 14 ? 5 : 45,
          isDay: i < 7 || i > 20,
        })),
      },
    },

    rss: {
      slug: 'rss',
      field: 'displayMode',
      values: RSS_DISPLAY_MODES.map((mode) => mode.value),
      config: {
        url: 'https://example.com/feed',
        theme: 'dark',
        showQr: false,
        itemCount: 8,
        secondsPerStory: 10,
      },
      data: {
        title: 'The Daily Review',
        link: 'https://example.com',
        items: [
          { title: 'City council approves the riverside tram extension after four years of debate', summary: 'Construction begins in September and the first services are expected to run in late 2028, connecting the old town to the northern districts.', imageUrl: asset('city'), publishedAt: hoursAgo(1), link: 'https://example.com/1' },
          { title: 'Record harvest lifts regional exports to a five-year high', summary: 'Favourable spring rainfall and a mild June combined to produce the strongest yield since 2021, growers association says.', imageUrl: asset('field'), publishedAt: hoursAgo(2), link: 'https://example.com/2' },
          { title: 'New research centre opens its doors to students this autumn', summary: 'The building houses six laboratories and a public exhibition floor.', imageUrl: asset('building'), publishedAt: hoursAgo(3), link: 'https://example.com/3' },
          { title: 'Marathon route confirmed, three bridges to close on Sunday morning', summary: 'Organisers expect twelve thousand runners across the full and half distances.', imageUrl: asset('crowd'), publishedAt: hoursAgo(4), link: 'https://example.com/4' },
          { title: 'Gallery acquires a long-lost landscape by a local painter', summary: 'The work had been in a private collection since 1963.', imageUrl: asset('gallery'), publishedAt: hoursAgo(5), link: 'https://example.com/5' },
          { title: 'Rail operator adds four late services on the coastal line', summary: 'The timetable change takes effect at the start of next month.', imageUrl: asset('rail'), publishedAt: hoursAgo(6), link: 'https://example.com/6' },
          { title: 'Weekend forecast: warm, with a chance of storms by Sunday evening', summary: 'Temperatures climb to 33 degrees before a front moves in from the west.', imageUrl: asset('sky'), publishedAt: hoursAgo(7), link: 'https://example.com/7' },
          { title: 'Library extends its summer opening hours through August', summary: 'Reading rooms will stay open until ten on weekdays.', imageUrl: asset('library'), publishedAt: hoursAgo(8), link: 'https://example.com/8' },
        ],
      },
    },

    calendar: {
      // Outlook normalizes to `GcalPayload` and reuses this embed wholesale, so
      // one set of images serves both apps.
      slug: 'gcal',
      field: 'calendarView',
      values: ['day', 'week', 'month', 'schedule'],
      config: {
        theme: 'dark',
        language: 'en',
        // The day/week/month grids should show a full working day, not just
        // what is left of it.
        onlyUpcoming: false,
        autoScroll: false,
      },
      data: {
        calendarLabel: 'Meeting Room A',
        // Spread from −3 to +3 days on purpose: the week grid is anchored to the
        // real run date, so events bunched on `today` land in whichever column
        // that weekday happens to be — all in the last one when the script runs
        // on a Sunday. A symmetric spread fills the grid whatever day it runs.
        events: [
          { title: 'Supplier visit', start: onWeekdayAt(0, 10, 0), end: onWeekdayAt(0, 12, 0), allDay: false },
          { title: 'Quarterly review', start: onWeekdayAt(1, 11, 0), end: onWeekdayAt(1, 12, 30), allDay: false, location: 'Boardroom' },
          { title: 'Interview: front-end engineer', start: onWeekdayAt(2, 14, 0), end: onWeekdayAt(2, 15, 0), allDay: false },
          { title: 'Standup', start: todayAt(9, 0), end: todayAt(9, 15), allDay: false, location: 'Room A' },
          { title: 'Design review — menu board templates', start: todayAt(10, 0), end: todayAt(11, 30), allDay: false, location: 'Room A' },
          { title: 'Lunch & learn', start: todayAt(12, 30), end: todayAt(13, 30), allDay: false, location: 'Canteen' },
          { title: `Customer call — ${DEMO_VENUE}`, start: todayAt(15, 0), end: todayAt(16, 0), allDay: false },
          { title: 'Sprint planning', start: onWeekdayAt(3, 9, 30), end: onWeekdayAt(3, 11, 0), allDay: false, location: 'Room B' },
          { title: 'Company offsite', start: onWeekdayAt(4, 0, 0), allDay: true },
          { title: 'Release 2.4 to production', start: onWeekdayAt(4, 17, 0), end: onWeekdayAt(4, 18, 0), allDay: false },
        ],
      },
    },

    social: {
      // Any of the four social-feed apps renders identically; Instagram is the
      // one that exercises the image path hardest, so it stands in for all.
      slug: 'instagram',
      field: 'layout',
      values: ['spotlight', 'grid'],
      config: {
        theme: 'dark',
        slideSeconds: 10,
        showCaption: true,
      },
      data: {
        accountLabel: '@harbourandvine',
        posts: [
          { id: '1', text: 'The summer terrace is open every evening until midnight ☀️', imageUrl: asset('terrace'), mediaType: 'image', timestamp: hoursAgo(2) },
          { id: '2', text: 'Roasting a new single origin this week — come and taste it', imageUrl: asset('coffee'), mediaType: 'image', timestamp: hoursAgo(6) },
          { id: '3', text: 'Live music Friday from 21:00', imageUrl: asset('music'), mediaType: 'image', timestamp: hoursAgo(20) },
          { id: '4', text: 'Pastries out of the oven every morning at seven', imageUrl: asset('pastry'), mediaType: 'image', timestamp: hoursAgo(28) },
          { id: '5', text: 'Thank you for a full house last night', imageUrl: asset('crowd'), mediaType: 'image', timestamp: hoursAgo(44) },
          { id: '6', text: 'Sunday brunch starts at 10:00', imageUrl: asset('brunch'), mediaType: 'image', timestamp: hoursAgo(52) },
        ],
      },
    },
  }
}

/**
 * The placeholder art the fixtures reference, as `<name, [from, to]>` duotone
 * gradient stops. Generated as JPEGs by the script rather than committed: at the
 * ~150px the carousel actually shows, a soft gradient reads as a photograph, and
 * this keeps the repo free of binary art with licensing to track.
 */
export const PLACEHOLDER_ART: Record<string, readonly [string, string]> = {
  // Menu — warm kitchen tones.
  coffee: ['#3A2013', '#C8894A'],
  cappuccino: ['#4B2E19', '#E0B583'],
  flatwhite: ['#2A1710', '#A9682F'],
  coldbrew: ['#2A1A12', '#8C5A38'],
  toast: ['#33170F', '#B4552E'],
  chicken: ['#2C2419', '#C9A227'],
  salad: ['#1E3018', '#7FA845'],
  steak: ['#301A10', '#B86A32'],
  pastry: ['#42290C', '#E2A83B'],
  pancakes: ['#3A2612', '#D19A4E'],
  brunch: ['#33240F', '#C08A3E'],
  lemonade: ['#2E3512', '#C9CE55'],
  // Social.
  terrace: ['#0F3228', '#5FAE86'],
  music: ['#231038', '#8B5BC4'],
  // News.
  city: ['#131E33', '#5C7FA8'],
  field: ['#26330F', '#9BB03F'],
  building: ['#1A202B', '#7E8CA0'],
  crowd: ['#2C1624', '#B0648A'],
  gallery: ['#241B30', '#9A83B8'],
  sky: ['#112A42', '#67A8D4'],
  rail: ['#1F2328', '#8A9099'],
  library: ['#2B2418', '#A8905F'],
}
