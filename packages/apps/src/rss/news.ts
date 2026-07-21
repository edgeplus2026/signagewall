import type { AppManifest } from '@edge/apps-contract'

import { rssManifest } from './manifest.js'

/**
 * Branded news apps built from the generic RSS app. They are the SAME app —
 * same connector (registered per slug → the RSS connector), same embed runtime
 * (a thin `embeds/<slug>/` that re-uses the RSS bundle) — except the feed URL is
 * fixed by us and the operator never sees it. That's done by reusing
 * {@link rssManifest}'s `configSchema` and marking the `url` field `hidden` with
 * the preset as its default, so it stays in the config (fetched by the connector)
 * but out of the form. Add a new outlet by dropping a row in {@link NEWS_PRESETS}
 * and an `embeds/<slug>/` folder — nothing else to touch here.
 */
const NEWS_ICON =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 22h16a2 2 0 0 0 2-2V4a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9a1 1 0 0 1 1-1h1"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8V6Z"/></svg>'

export interface NewsPreset {
  /** Catalog slug + embed folder + connector-registry key. */
  slug: string
  name: string
  tagline: string
  description: string
  /** The predefined feed URL (hidden from the operator). */
  url: string
  /** Brand colour. */
  color: string
}

export const NEWS_PRESETS: NewsPreset[] = [
  {
    slug: 'cnn',
    name: 'CNN',
    tagline: 'Latest world headlines from CNN',
    description: "Show CNN's latest world headlines on your screens — refreshed automatically.",
    url: 'http://rss.cnn.com/rss/edition.xml',
    color: '#CC0000',
  },
  {
    slug: 'bbc',
    name: 'BBC News',
    tagline: 'World news from the BBC',
    description: "Show the BBC's latest world news on your screens — refreshed automatically.",
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    color: '#B90005',
  },
  {
    slug: 'aljazeera',
    name: 'Al Jazeera',
    tagline: 'Global news from Al Jazeera',
    description: "Show Al Jazeera's latest news on your screens — refreshed automatically.",
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    color: '#FA9000',
  },
  {
    slug: 'guardian',
    name: 'The Guardian',
    tagline: 'World news from The Guardian',
    description: "Show The Guardian's latest world news on your screens — refreshed automatically.",
    url: 'https://www.theguardian.com/world/rss',
    color: '#052962',
  },
  {
    slug: 'dw',
    name: 'Deutsche Welle',
    tagline: 'World news from Deutsche Welle',
    description: "Show Deutsche Welle's latest world news on your screens — refreshed automatically.",
    url: 'https://rss.dw.com/rdf/rss-en-all',
    color: '#0A4EA2',
  },
  {
    slug: 'france24',
    name: 'France 24',
    tagline: 'International news from France 24',
    description: "Show France 24's latest international news on your screens — refreshed automatically.",
    url: 'https://www.france24.com/en/rss',
    color: '#00558C',
  },
  {
    slug: 'skynews',
    name: 'Sky News',
    tagline: 'Breaking world news from Sky News',
    description: "Show Sky News's latest world headlines on your screens — refreshed automatically.",
    url: 'https://feeds.skynews.com/feeds/rss/world.xml',
    color: '#EC1C24',
  },
]

/** Build a branded news manifest from a preset (reusing the RSS app's schema). */
export function newsFeedManifest(preset: NewsPreset): AppManifest {
  return {
    ...rssManifest,
    slug: preset.slug,
    name: preset.name,
    tagline: preset.tagline,
    description: preset.description,
    color: preset.color,
    icon: NEWS_ICON,
    configSchema: rssManifest.configSchema.map((field) =>
      field.key === 'url'
        ? { ...field, hidden: true, required: true, default: preset.url }
        : field,
    ),
  }
}

export const NEWS_MANIFESTS: AppManifest[] = NEWS_PRESETS.map(newsFeedManifest)
