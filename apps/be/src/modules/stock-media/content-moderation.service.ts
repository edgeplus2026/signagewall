import { Injectable } from '@nestjs/common';

/**
 * Guards stock-media searches against disallowed queries before they ever reach
 * an external provider. Deliberately simple and easy to extend: add terms to
 * the relevant category array (or swap in a richer engine/remote list later)
 * without touching call sites.
 *
 * Matching is whole-word and case-insensitive so substrings of legitimate
 * words ("class", "grass") are not falsely flagged.
 */
@Injectable()
export class ContentModerationService {
  private readonly blockedTerms: Record<string, string[]> = {
    sexual: [
      'porn',
      'porno',
      'pornographic',
      'xxx',
      'nsfw',
      'nude',
      'nudes',
      'nudity',
      'naked',
      'sex',
      'sexual',
      'erotic',
      'erotica',
      'hentai',
      'fetish',
      'orgy',
      'masturbation',
      'genital',
      'genitals',
    ],
    hate: ['nazi', 'swastika', 'kkk', 'whitepower', 'heil'],
    violence: [
      'gore',
      'gory',
      'beheading',
      'decapitation',
      'mutilation',
      'massacre',
      'lynching',
      'execution',
    ],
  };

  private readonly pattern: RegExp;

  constructor() {
    const terms = Object.values(this.blockedTerms)
      .flat()
      .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

    this.pattern = new RegExp(`\\b(?:${terms.join('|')})\\b`, 'i');
  }

  /** Returns true when the query contains a blocked term. */
  isBlocked(query: string): boolean {
    return this.pattern.test(query);
  }
}
