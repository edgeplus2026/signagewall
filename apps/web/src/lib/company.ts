/**
 * The legal identity behind SignageWall.
 *
 * One place, because these details appear in the Terms, the Privacy Policy, the
 * Cookie Policy, the About page, the Contact page and the `Organization`
 * structured data — and a company that is named six different ways is a company
 * a reader stops trusting.
 *
 * The `TODO_` values are not yet known. They render as a visible marker rather
 * than an empty string on purpose: a legal document that silently omits the
 * controller's name looks finished and is not.
 */

const MISSING = (what: string) => `[NEDOSTAJE: ${what}]`

export const COMPANY = {
  /** Trading name. */
  name: 'SignageWall',

  /** Full registered company name, as it appears in the business register. */
  legalName: MISSING('pun pravni naziv društva'),
  /** Registered seat — street, number, postcode, city, country. */
  address: MISSING('sedište i adresa'),
  /** Matični broj. */
  registrationNumber: MISSING('matični broj'),
  /** PIB. */
  taxNumber: MISSING('PIB'),

  /**
   * Contact for legal and data-protection requests.
   *
   * Deliberately the address the site already publishes rather than invented
   * `legal@` / `privacy@` aliases: a GDPR request has to reach a mailbox
   * somebody actually reads. That is currently the Gmail account behind the
   * brand — a published `office@signagewall.com` that nobody has created yet
   * would bounce every request these documents promise to answer. Move it to
   * the domain here, and in the `contact.json` message file of each locale,
   * once that mailbox exists.
   */
  email: 'signagewall@gmail.com',

  /** Canonical public origin, without protocol — for prose, not for links. */
  domain: 'www.signagewall.com',
} as const

/** True once every legal detail has been filled in. */
export const COMPANY_DETAILS_COMPLETE = ![
  COMPANY.legalName,
  COMPANY.address,
  COMPANY.registrationNumber,
  COMPANY.taxNumber,
].some((v) => v.startsWith('[NEDOSTAJE'))
