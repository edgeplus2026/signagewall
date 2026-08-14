import type { Route } from '@/lib/seo'
import { absoluteUrl, resolveCanonicalUrl } from '@/lib/seo'
import { SITE_URL as siteUrl } from '@/lib/site-url'
import { SOCIAL_SAME_AS } from '@/lib/social'

export type JsonLdNode = Record<string, unknown>

/**
 * JSON-LD lives inside a script element, so a literal `</script>` in CMS copy
 * must not be able to close that element. JSON's unicode escape is equivalent
 * data to a parser, while remaining inert to the HTML parser.
 */
export function serializeJsonLd(data: unknown): string {
  // TypeScript's lib types declare a string for the `unknown` overload even
  // though the runtime returns undefined for values such as `undefined`.
  const json = JSON.stringify(data) as string | undefined
  return (json ?? 'null')
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

/** Renders one structured-data block. Server-only by construction. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  )
}

/** Renders related entities in one schema.org graph. */
export function JsonLdGraph({ nodes }: { nodes: JsonLdNode[] }) {
  if (nodes.length === 0) return null
  return <JsonLd data={{ '@context': 'https://schema.org', '@graph': nodes }} />
}

export const ORGANIZATION_ID = `${siteUrl}/#organization`
export const WEBSITE_ID = `${siteUrl}/#website`
export const SOFTWARE_PRODUCT_ID = `${siteUrl}/#software`

const pageId = (url: string) => `${url}#webpage`

function contentUrl(locale: string, path: Route, canonical?: string): string {
  return resolveCanonicalUrl(canonical) ?? absoluteUrl(locale, path)
}

/**
 * Resolves Payload media paths and other site-relative asset URLs to an
 * absolute HTTP(S) URL. Invalid and non-web protocols are omitted from
 * structured data instead of publishing an unusable image reference.
 */
export function absoluteSchemaUrl(value: string | undefined): string | undefined {
  const candidate = value?.trim()
  if (!candidate) return undefined

  try {
    const url = new URL(candidate, `${siteUrl}/`)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : undefined
  } catch {
    return undefined
  }
}

/** Organization + WebSite + the SignageWall platform entity. Render once in
    the root layout; page-level entities reference these stable @ids. */
export function OrganizationJsonLd() {
  return (
    <JsonLdGraph
      nodes={[
        {
          '@type': 'Organization',
          '@id': ORGANIZATION_ID,
          name: 'SignageWall',
          url: siteUrl,
          logo: {
            '@type': 'ImageObject',
            url: `${siteUrl}/brand/signagewall-mark-512.png`,
          },
          description: 'Software for digital screens.',
          /* The profiles this company owns. Without it a search engine has a
             site and four unrelated accounts that happen to share a name; with
             it they resolve to one entity, and a branded search returns the
             site and its profiles instead of the industry's generic results. */
          sameAs: SOCIAL_SAME_AS,
        },
        {
          '@type': 'WebSite',
          '@id': WEBSITE_ID,
          url: siteUrl,
          name: 'SignageWall',
          publisher: { '@id': ORGANIZATION_ID },
          inLanguage: ['sr', 'en'],
        },
        {
          '@type': 'SoftwareApplication',
          '@id': SOFTWARE_PRODUCT_ID,
          name: 'SignageWall',
          url: siteUrl,
          applicationCategory: 'BusinessApplication',
          applicationSubCategory: 'Digital signage',
          operatingSystem: 'Android, Windows, macOS, Linux',
          publisher: { '@id': ORGANIZATION_ID },
        },
      ]}
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
  if (items.length === 0) return null

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

export type WebPageType = 'WebPage' | 'AboutPage' | 'ContactPage' | 'CollectionPage'

export interface WebPageMeta {
  locale: string
  path: Route
  name: string
  description?: string | undefined
  image?: string | undefined
  published?: string | undefined
  modified?: string | undefined
  type?: WebPageType | undefined
  /** Canonical identity for deliberately consolidated content. */
  canonical?: string | undefined
  /** @id of the article, service, application, or list represented by the page. */
  mainEntityId?: string | undefined
}

function webPageNode(page: WebPageMeta, type: WebPageType = page.type ?? 'WebPage'): JsonLdNode {
  const url = contentUrl(page.locale, page.path, page.canonical)
  const image = absoluteSchemaUrl(page.image)

  return {
    '@type': type,
    '@id': pageId(url),
    url,
    name: page.name,
    ...(page.description ? { description: page.description } : {}),
    ...(image
      ? {
          primaryImageOfPage: {
            '@type': 'ImageObject',
            url: image,
          },
        }
      : {}),
    ...(page.published ? { datePublished: page.published } : {}),
    ...(page.modified ? { dateModified: page.modified } : {}),
    ...(page.mainEntityId ? { mainEntity: { '@id': page.mainEntityId } } : {}),
    isPartOf: { '@id': WEBSITE_ID },
    inLanguage: page.locale,
  }
}

/** A reusable page entity for detail and editorial landing pages. */
export function WebPageJsonLd({ page }: { page: WebPageMeta }) {
  return <JsonLdGraph nodes={[webPageNode(page)]} />
}

export type ItemListEntityType =
  | 'Thing'
  | 'WebPage'
  | 'BlogPosting'
  | 'Service'
  | 'SoftwareApplication'

export interface ItemListEntry {
  name: string
  /** Prefer a Route for internal content so localized paths resolve correctly. */
  path?: Route | undefined
  /** Absolute or site-relative fallback for content without a typed Route. */
  url?: string | undefined
  description?: string | undefined
  image?: string | undefined
  type?: ItemListEntityType | undefined
  /** Explicit entity @id. Defaults to the detail URL plus its conventional fragment. */
  id?: string | undefined
}

export interface ItemListMeta {
  locale: string
  path: Route
  items: ItemListEntry[]
  name?: string | undefined
  description?: string | undefined
  order?: 'ItemListOrderAscending' | 'ItemListOrderDescending' | 'ItemListUnordered' | undefined
}

const ENTITY_FRAGMENTS: Partial<Record<ItemListEntityType, string>> = {
  BlogPosting: 'article',
  Service: 'service',
  SoftwareApplication: 'app',
}

function itemUrl(locale: string, item: ItemListEntry): string | undefined {
  return item.path ? absoluteUrl(locale, item.path) : absoluteSchemaUrl(item.url)
}

function itemListNode(list: ItemListMeta): JsonLdNode {
  const url = absoluteUrl(list.locale, list.path)
  const id = `${url}#item-list`
  const resolvedItems = list.items.flatMap((item) => {
    const url = itemUrl(list.locale, item)
    return url ? [{ item, url }] : []
  })
  const elements = resolvedItems.map(({ item, url: resolvedUrl }, index) => {
    const type = item.type ?? 'WebPage'
    const fragment = ENTITY_FRAGMENTS[type]
    const image = absoluteSchemaUrl(item.image)
    const entityId = item.id ?? (fragment ? `${resolvedUrl}#${fragment}` : resolvedUrl)

    return {
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: resolvedUrl,
      item: {
        '@type': type,
        '@id': entityId,
        url: resolvedUrl,
        name: item.name,
        ...(item.description ? { description: item.description } : {}),
        ...(image ? { image } : {}),
      },
    }
  })

  return {
    '@type': 'ItemList',
    '@id': id,
    ...(list.name ? { name: list.name } : {}),
    ...(list.description ? { description: list.description } : {}),
    numberOfItems: elements.length,
    itemListOrder: `https://schema.org/${list.order ?? 'ItemListUnordered'}`,
    itemListElement: elements,
    isPartOf: { '@id': pageId(url) },
  }
}

/** A standalone ItemList for pages that already emit their WebPage node. */
export function ItemListJsonLd({ list }: { list: ItemListMeta }) {
  return <JsonLdGraph nodes={[itemListNode(list)]} />
}

export interface CollectionPageMeta extends Omit<
  WebPageMeta,
  'type' | 'canonical' | 'mainEntityId'
> {
  items: ItemListEntry[]
  itemListName?: string | undefined
  itemListDescription?: string | undefined
  itemListOrder?:
    | 'ItemListOrderAscending'
    | 'ItemListOrderDescending'
    | 'ItemListUnordered'
    | undefined
}

/**
 * A content hub graph: the CollectionPage points to one ItemList and the list
 * points back to the page. Each list item can reference the entity emitted by
 * its detail page (`#article`, `#service`, or `#app`).
 */
export function CollectionPageJsonLd({ page }: { page: CollectionPageMeta }) {
  const url = absoluteUrl(page.locale, page.path)
  const list: ItemListMeta = {
    locale: page.locale,
    path: page.path,
    items: page.items,
    ...(page.itemListName ? { name: page.itemListName } : {}),
    ...(page.itemListDescription ? { description: page.itemListDescription } : {}),
    ...(page.itemListOrder ? { order: page.itemListOrder } : {}),
  }
  const pageMeta: WebPageMeta = {
    locale: page.locale,
    path: page.path,
    name: page.name,
    ...(page.description ? { description: page.description } : {}),
    ...(page.image ? { image: page.image } : {}),
    ...(page.published ? { published: page.published } : {}),
    ...(page.modified ? { modified: page.modified } : {}),
    mainEntityId: `${url}#item-list`,
  }

  return <JsonLdGraph nodes={[webPageNode(pageMeta, 'CollectionPage'), itemListNode(list)]} />
}

export interface ArticleAuthorMeta {
  name: string
  url?: string | undefined
  type?: 'Person' | 'Organization' | undefined
}

export interface ArticleMeta {
  locale: string
  path: Route
  title: string
  description?: string | undefined
  image?: string | undefined
  published?: string | undefined
  modified?: string | undefined
  /** A string remains supported; use the object form to attach an author URL. */
  author?: string | ArticleAuthorMeta | undefined
  /** Backward-compatible convenience when `author` is supplied as a string. */
  authorUrl?: string | undefined
  section?: string | undefined
  canonical?: string | undefined
}

function articleAuthor(article: ArticleMeta): JsonLdNode {
  if (!article.author) return { '@id': ORGANIZATION_ID }

  const author =
    typeof article.author === 'string'
      ? { name: article.author, url: article.authorUrl, type: 'Person' as const }
      : article.author
  const url = absoluteSchemaUrl(author.url)

  return {
    '@type': author.type ?? 'Person',
    ...(url ? { '@id': url, url } : {}),
    name: author.name,
  }
}

export function ArticleJsonLd({ article }: { article: ArticleMeta }) {
  const url = contentUrl(article.locale, article.path, article.canonical)
  const articleId = `${url}#article`
  const image = absoluteSchemaUrl(article.image)
  const modified = article.modified ?? article.published
  const page: WebPageMeta = {
    locale: article.locale,
    path: article.path,
    name: article.title,
    ...(article.description ? { description: article.description } : {}),
    ...(image ? { image } : {}),
    ...(article.published ? { published: article.published } : {}),
    ...(modified ? { modified } : {}),
    ...(article.canonical ? { canonical: article.canonical } : {}),
    mainEntityId: articleId,
  }

  return (
    <JsonLdGraph
      nodes={[
        webPageNode(page),
        {
          '@type': 'BlogPosting',
          '@id': articleId,
          url,
          headline: article.title,
          ...(article.description ? { description: article.description } : {}),
          ...(image ? { image: [image] } : {}),
          ...(article.published ? { datePublished: article.published } : {}),
          ...(modified ? { dateModified: modified } : {}),
          author: articleAuthor(article),
          ...(article.section ? { articleSection: article.section } : {}),
          publisher: { '@id': ORGANIZATION_ID },
          isPartOf: { '@id': WEBSITE_ID },
          mainEntityOfPage: { '@id': pageId(url) },
          inLanguage: article.locale,
        },
      ]}
    />
  )
}

export interface ServiceAudienceMeta {
  name: string
  type?: 'Audience' | 'BusinessAudience' | undefined
}

export interface ServiceMeta {
  locale: string
  path: Route
  name: string
  description: string
  areaServed?: string | string[] | undefined
  /** Defaults to Digital signage; make this more specific when the page is. */
  serviceType?: string | undefined
  audience?: string | ServiceAudienceMeta | undefined
  industry?: string | undefined
  image?: string | undefined
  canonical?: string | undefined
}

function serviceAudience(audience: ServiceMeta['audience']): JsonLdNode | undefined {
  if (!audience) return undefined
  if (typeof audience === 'string') {
    return { '@type': 'Audience', audienceType: audience }
  }
  return {
    '@type': audience.type ?? 'Audience',
    name: audience.name,
    audienceType: audience.name,
  }
}

/** An industry page as a WebPage whose main entity is the offered service. */
export function ServiceJsonLd({ service }: { service: ServiceMeta }) {
  const url = contentUrl(service.locale, service.path, service.canonical)
  const serviceId = `${url}#service`
  const audience = serviceAudience(service.audience)
  const image = absoluteSchemaUrl(service.image)
  const page: WebPageMeta = {
    locale: service.locale,
    path: service.path,
    name: service.name,
    description: service.description,
    ...(image ? { image } : {}),
    ...(service.canonical ? { canonical: service.canonical } : {}),
    mainEntityId: serviceId,
  }

  return (
    <JsonLdGraph
      nodes={[
        webPageNode(page),
        {
          '@type': 'Service',
          '@id': serviceId,
          name: service.name,
          description: service.description,
          serviceType: service.serviceType ?? 'Digital signage',
          provider: { '@id': ORGANIZATION_ID },
          ...(audience ? { audience } : {}),
          ...(service.industry ? { category: service.industry } : {}),
          ...(service.areaServed ? { areaServed: service.areaServed } : {}),
          ...(image ? { image } : {}),
          url,
          mainEntityOfPage: { '@id': pageId(url) },
        },
      ]}
    />
  )
}

export interface SoftwareMeta {
  locale: string
  path: Route
  name: string
  description: string
  category?: string | undefined
  image?: string | undefined
  features?: string[] | undefined
  requirements?: string | undefined
  operatingSystems?: string[] | undefined
  canonical?: string | undefined
}

/**
 * A catalogue app is a component of SignageWall, not a separately sold
 * product. Consequently this entity deliberately has no Offer.
 */
export function SoftwareAppJsonLd({ app }: { app: SoftwareMeta }) {
  const url = contentUrl(app.locale, app.path, app.canonical)
  const appId = `${url}#app`
  const image = absoluteSchemaUrl(app.image)
  const page: WebPageMeta = {
    locale: app.locale,
    path: app.path,
    name: app.name,
    description: app.description,
    ...(image ? { image } : {}),
    ...(app.canonical ? { canonical: app.canonical } : {}),
    mainEntityId: appId,
  }

  return (
    <JsonLdGraph
      nodes={[
        webPageNode(page),
        {
          '@type': 'SoftwareApplication',
          '@id': appId,
          name: app.name,
          description: app.description,
          applicationCategory: 'BusinessApplication',
          ...(app.category ? { applicationSubCategory: app.category } : {}),
          applicationSuite: 'SignageWall',
          operatingSystem: (app.operatingSystems ?? ['Android', 'Windows', 'macOS', 'Linux']).join(
            ', ',
          ),
          ...(app.features && app.features.length > 0 ? { featureList: app.features } : {}),
          ...(app.requirements ? { softwareRequirements: app.requirements } : {}),
          ...(image ? { image } : {}),
          isPartOf: { '@id': SOFTWARE_PRODUCT_ID },
          publisher: { '@id': ORGANIZATION_ID },
          url,
          mainEntityOfPage: { '@id': pageId(url) },
        },
      ]}
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
        '@id': SOFTWARE_PRODUCT_ID,
        name: offer.name,
        description: offer.description,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Android, Windows, macOS, Linux',
        publisher: { '@id': ORGANIZATION_ID },
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

export interface FaqItem {
  q: string
  a: string
}

/**
 * FAQ blocks must describe question/answer pairs visibly rendered on the same
 * page. Pass `visible={false}` when a shared component suppresses its visual
 * FAQ variant; empty questions and answers are never emitted.
 */
export function FaqJsonLd({
  items,
  visible = true,
}: {
  items: FaqItem[]
  visible?: boolean | undefined
}) {
  const visibleItems = visible ? items.filter((item) => item.q.trim() && item.a.trim()) : []
  if (visibleItems.length === 0) return null

  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: visibleItems.map((item) => ({
          '@type': 'Question',
          name: item.q,
          acceptedAnswer: { '@type': 'Answer', text: item.a },
        })),
      }}
    />
  )
}
