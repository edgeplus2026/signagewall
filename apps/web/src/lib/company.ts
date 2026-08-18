/**
 * The legal identity behind SignageWall.
 *
 * One place, because these details appear in the Terms, the Privacy Policy, the
 * Cookie Policy, the About page, the Contact page and the `Organization`
 * structured data — and a company that is named six different ways is a company
 * a reader stops trusting.
 *
 * Filled in from the business register on 2026-08-18. `apps/be` keeps its own
 * copy of the same values for the Terms and Privacy Policy served inside the
 * app (`legal.content.ts`) — the two state the same company and must not drift.
 */

export const COMPANY = {
  /** Trading name. */
  name: 'SignageWall',

  /**
   * Full registered name, exactly as the business register (APR) records it.
   *
   * Not `BYTESICHT` — that is only the skraćeno poslovno ime. The company is a
   * preduzetnik, whose registered name is built from the founder's own name,
   * `pr`, the activity and the seat, and that full form is what identifies the
   * counterparty in a contract and what Microsoft matches against the register.
   * `name` above stays the brand; do not "tidy" this one back to it.
   */
  legalName: 'Milan Danilović pr Računarsko programiranje BYTESICHT Niš',
  /** Registered seat, incl. the municipality, as the register writes it. */
  address: 'Radnička 2, 18000 Niš (Palilula), Srbija',
  /** Matični broj. */
  registrationNumber: '67813472',
  /** PIB. Quoted beside the matični broj in the Terms of both apps. */
  taxNumber: '114734080',

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
export const COMPANY_DETAILS_COMPLETE = [
  COMPANY.legalName,
  COMPANY.address,
  COMPANY.registrationNumber,
  COMPANY.taxNumber,
].every((v) => v.length > 0)
