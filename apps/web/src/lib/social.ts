/**
 * The brand's accounts on other platforms.
 *
 * One list, because these URLs are published for two different readers: the
 * footer renders them for people, and `Organization.sameAs` hands the identical
 * set to search engines as the claim that every one of these accounts is this
 * company. A profile that appears in only one of the two places weakens both —
 * the entity is confirmed by the agreement between them, not by either alone.
 */

export const SOCIAL_PROFILES = [
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/signagewall' },
  { name: 'Instagram', url: 'https://www.instagram.com/signagewall' },
  /* The numeric profile URL, not `/signagewall`: a Page keeps this address for
     life, while a vanity username can be changed or lost, and a `sameAs` that
     404s is worse than one that is ugly. Swap it only once the username is set
     and settled. */
  { name: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61592695683051' },
  { name: 'X', url: 'https://x.com/signagewall' },
] as const

/* Derived from the list rather than declared beside it: a platform added above
   is a platform the footer's glyph table is then required to cover, and the
   build says so. An interface here would widen `name` back to `string` and
   that check would quietly stop happening. */
export type SocialProfile = (typeof SOCIAL_PROFILES)[number]
/** The platform, spelled the way that platform spells itself. */
export type SocialPlatform = SocialProfile['name']

/** schema.org's term for "these accounts are the same entity as this site". */
export const SOCIAL_SAME_AS: string[] = SOCIAL_PROFILES.map((profile) => profile.url)

/** Twitter cards attribute the page to an account by handle, not by URL. */
export const X_HANDLE = '@signagewall'
