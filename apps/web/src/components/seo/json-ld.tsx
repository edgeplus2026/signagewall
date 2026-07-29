import type { Route } from '@/lib/seo'
import { absoluteUrl } from '@/lib/seo'
import { SITE_URL as siteUrl } from '@/lib/site-url'

/** Renders one structured-data block. Server-only by construction. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  )
}

const ORGANIZATION_ID = `${siteUrl}/#organization`

/** Organization + WebSite. Rendered once in the root layout; everything else
    references it by @id rather than repeating the publisher on every page. */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'Organization',
            '@id': ORGANIZATION_ID,
            name: 'SignageWall',
            url: siteUrl,
            logo: `${siteUrl}/brand/signagewall-mark-512.png`,
            description: 'Software for digital screens.',
          },
          {
            '@type': 'WebSite',
            '@id': `${siteUrl}/#website`,
            url: siteUrl,
            name: 'SignageWall',
            publisher: { '@id': ORGANIZATION_ID },
            inLanguage: ['sr', 'en'],
          },
        ],
      }}
    />
  )
}

export interface Crumb {
  name: string
  /** Internal route, e.g. `/solutions`. Omit on the current page. */
  path?: Route
}

/**
 * Breadcrumbs. Google reads these to render the path under a result instead of
 * a bare URL, which is most of the value on deep pages like /apps/<slug>.
 */
export function BreadcrumbJsonLd({ locale, items }: { locale: string; items: Crumb[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: item.name,
          ...(item.path ? { item: absoluteUrl(locale, item.path) } : {}),
        })),
      }}
    />
  )
}

export interface ArticleMeta {
  locale: string
  path: Route
  title: string
  description?: string | undefined
  image?: string | undefined
  published?: string | undefined
  modified?: string | undefined
  author?: string | undefined
  section?: string | undefined
}

export function ArticleJsonLd({ article }: { article: ArticleMeta }) {
  const url = absoluteUrl(article.locale, article.path)
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        headline: article.title,
        ...(article.description ? { description: article.description } : {}),
        ...(article.image ? { image: [article.image] } : {}),
        ...(article.published ? { datePublished: article.published } : {}),
        // Falls back to published: Google treats a missing dateModified as
        // "never updated", which reads worse than "updated when written".
        dateModified: article.modified ?? article.published,
        ...(article.author ? { author: { '@type': 'Person', name: article.author } } : {}),
        ...(article.section ? { articleSection: article.section } : {}),
        publisher: { '@id': ORGANIZATION_ID },
        mainEntityOfPage: { '@type': 'WebPage', '@id': url },
        inLanguage: article.locale,
      }}
    />
  )
}

export interface ServiceMeta {
  locale: string
  path: Route
  name: string
  description: string
  areaServed?: string | undefined
}

/** Industry pages describe a service offered to that sector. */
export function ServiceJsonLd({ service }: { service: ServiceMeta }) {
  const url = absoluteUrl(service.locale, service.path)
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Service',
        '@id': `${url}#service`,
        name: service.name,
        description: service.description,
        serviceType: 'Digital signage',
        provider: { '@id': ORGANIZATION_ID },
        ...(service.areaServed ? { areaServed: service.areaServed } : {}),
        url,
      }}
    />
  )
}

export interface SoftwareMeta {
  locale: string
  path: Route
  name: string
  description: string
  category?: string | undefined
}

/** Each catalogue app is a component of the signage platform. */
export function SoftwareAppJsonLd({ app }: { app: SoftwareMeta }) {
  const url = absoluteUrl(app.locale, app.path)
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${url}#app`,
        name: app.name,
        description: app.description,
        applicationCategory: 'BusinessApplication',
        ...(app.category ? { applicationSubCategory: app.category } : {}),
        operatingSystem: 'Android, Windows, macOS, Linux',
        publisher: { '@id': ORGANIZATION_ID },
        url,
      }}
    />
  )
}

export interface ProductOfferMeta {
  locale: string
  path: Route
  name: string
  description: string
  price: number
  currency: string
  trialDays: number
}

/**
 * The product itself, with its price.
 *
 * This is the one schema an assistant reads when someone asks "how much does
 * SignageWall cost" — so the number comes from `lib/pricing`, the same constant
 * the page renders, and cannot answer differently to the two of them.
 */
export function PricingJsonLd({ offer }: { offer: ProductOfferMeta }) {
  const url = absoluteUrl(offer.locale, offer.path)
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        '@id': `${url}#product`,
        name: offer.name,
        description: offer.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Android, Windows, macOS, Linux',
        publisher: { '@id': ORGANIZATION_ID },
        url,
        offers: {
          '@type': 'Offer',
          price: offer.price,
          priceCurrency: offer.currency,
          // Per screen, per month — without this the number is meaningless.
          priceSpecification: {
            '@type': 'UnitPriceSpecification',
            price: offer.price,
            priceCurrency: offer.currency,
            unitText: 'screen',
            billingDuration: 1,
            billingIncrement: 1,
          },
          availability: 'https://schema.org/InStock',
          url,
        },
      }}
    />
  )
}

/**
 * FAQ blocks. Only emit this where the questions are genuinely answered on the
 * page — markup that isn't visible to the reader is a guideline violation.
 *
 * Google retired FAQ rich results in May 2026, so this no longer buys expanded
 * SERP real estate. It stays because the assistants that now answer these
 * questions — AI Overviews, ChatGPT, Perplexity — still parse it, and a
 * question/answer pair is the shape they cite most readily.
 */
export function FaqJsonLd({ items }: { items: { q: string; a: string }[] }) {
  if (items.length === 0) return null
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: items.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }}
    />
  )
}
