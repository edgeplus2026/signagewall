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
   * On the domain now that it resolves. A controller that publishes a free
   * Gmail reads as an individual rather than a company, and every vendor check
   * that matters here — Microsoft publisher verification, G2, LinkedIn — wants
   * a contact whose domain matches the site. The original constraint still
   * holds: a GDPR request has to reach a mailbox somebody actually reads. It
   * does, because this is a Cloudflare Email Routing alias rather than a
   * mailbox — nothing is stored at the domain, it forwards to the Gmail behind
   * the brand. Keep in step with the `contact.json` message file of each locale.
   */
  email: 'office@signagewall.com',

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
