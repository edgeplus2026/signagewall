export type LegalDocType = 'tos' | 'privacy';
export type LegalLocale = 'en' | 'sr';

export const LEGAL_DOC_TYPES: readonly LegalDocType[] = ['tos', 'privacy'];
export const LEGAL_LOCALES: readonly LegalLocale[] = ['en', 'sr'];

export interface LegalVersionMeta {
  /** Monotonic version id; bump to force re-consent. */
  version: string;
  /** ISO date the version takes effect. */
  effectiveDate: string;
}

/**
 * The currently-effective version of each legal document. **Bumping a `version`
 * forces every user to re-accept on their next session** (see
 * {@link LegalService.getAcceptanceStatus}). Keep in lockstep with the bodies in
 * `legal.content.ts`. Publishing a new version = edit the body + bump here + deploy.
 */
export const CURRENT_LEGAL: Record<LegalDocType, LegalVersionMeta> = {
  /* Bumped 2026-08-18: both documents now name the controller — registered
     name, seat, matični broj and PIB — and give a contact on the domain
     instead of a `[privacy@yourdomain]` placeholder. Until this version the
     Privacy Policy never said who processes the data, so the consent already
     on file was given against a document that could not identify its own
     counterparty. That is what re-consent is for. */
  tos: { version: '2026-08-18', effectiveDate: '2026-08-18' },
  privacy: { version: '2026-08-18', effectiveDate: '2026-08-18' },
};

export function isLegalDocType(value: unknown): value is LegalDocType {
  return value === 'tos' || value === 'privacy';
}

export function normalizeLegalLocale(value: unknown): LegalLocale {
  return value === 'sr' ? 'sr' : 'en';
}
