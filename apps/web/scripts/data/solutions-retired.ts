// @ts-nocheck
/**
 * Solution pages deliberately removed from the publishable catalog.
 *
 * These records are kept as stable identifiers for a non-destructive database
 * retirement pass. A retirement script may move matching documents to draft,
 * but must never delete them. `redirectTo` is present only where the old page
 * is a genuine subtype of one of the six retained intents; unrelated URLs
 * should be retired rather than redirected to a weakly related page.
 */
export const RETIRED_SOLUTIONS = [
  { slug: 'healthcare', srSlug: 'zdravstvo' },
  { slug: 'gyms', srSlug: 'teretane' },
  { slug: 'banking', srSlug: 'banke-i-finansije' },
  { slug: 'pharmacy', srSlug: 'apoteke' },
  { slug: 'automotive', srSlug: 'auto-industrija' },
  { slug: 'real-estate', srSlug: 'nekretnine' },
  { slug: 'salons', srSlug: 'saloni-lepote' },
  { slug: 'bakeries', srSlug: 'pekare', redirectTo: 'hospitality' },
  { slug: 'cinema', srSlug: 'bioskopi-i-zabava' },
  { slug: 'transport', srSlug: 'saobracaj-i-terminali' },
  { slug: 'coworking', srSlug: 'koworking', redirectTo: 'office' },
  { slug: 'veterinary', srSlug: 'veterina' },
  { slug: 'supermarkets', srSlug: 'supermarketi', redirectTo: 'retail' },
  { slug: 'events', srSlug: 'dogadjaji-i-sale' },
] as const

export const RETIRED_SOLUTION_SLUGS = RETIRED_SOLUTIONS.map(({ slug }) => slug)
