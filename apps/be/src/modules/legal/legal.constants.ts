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
  tos: { version: '2026-07-01', effectiveDate: '2026-07-01' },
  privacy: { version: '2026-07-01', effectiveDate: '2026-07-01' },
};

export function isLegalDocType(value: unknown): value is LegalDocType {
  return value === 'tos' || value === 'privacy';
}

export function normalizeLegalLocale(value: unknown): LegalLocale {
  return value === 'sr' ? 'sr' : 'en';
}
