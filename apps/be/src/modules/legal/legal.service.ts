import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';

import {
  CURRENT_LEGAL,
  LEGAL_DOC_TYPES,
  type LegalDocType,
  type LegalLocale,
  normalizeLegalLocale,
} from './legal.constants';
import { LEGAL_CONTENT } from './legal.content';
import { LegalRepository } from './legal.repository';

export interface LegalDocumentDto {
  type: LegalDocType;
  version: string;
  effectiveDate: string;
  title: string;
  body: string;
}

export interface AcceptanceStatusDto {
  needsReconsent: boolean;
  /** Documents whose current version the user has not yet accepted. */
  pending: { type: LegalDocType; version: string }[];
}

export interface LegalAcceptanceRecordDto {
  docType: string;
  version: string;
  acceptedAt: string;
}

@Injectable()
export class LegalService {
  constructor(private readonly legalRepository: LegalRepository) {}

  /** The current version + body of every legal document, in the given locale. */
  getDocuments(locale: string | undefined): LegalDocumentDto[] {
    const resolved: LegalLocale = normalizeLegalLocale(locale);
    return LEGAL_DOC_TYPES.map((type) => ({
      type,
      version: CURRENT_LEGAL[type].version,
      effectiveDate: CURRENT_LEGAL[type].effectiveDate,
      title: LEGAL_CONTENT[type][resolved].title,
      body: LEGAL_CONTENT[type][resolved].body,
    }));
  }

  /** Which current documents (if any) the user still needs to accept. */
  async getAcceptanceStatus(userId: string): Promise<AcceptanceStatusDto> {
    const accepted = await this.legalRepository.latestVersionsByDocType(userId);
    const pending = LEGAL_DOC_TYPES.filter(
      (type) => accepted[type] !== CURRENT_LEGAL[type].version,
    ).map((type) => ({ type, version: CURRENT_LEGAL[type].version }));

    return { needsReconsent: pending.length > 0, pending };
  }

  /** All of a user's acceptance records, newest first (for GDPR data export). */
  async listAcceptances(userId: string): Promise<LegalAcceptanceRecordDto[]> {
    const rows = await this.legalRepository.findByUser(userId);
    return rows.map((row) => ({
      docType: row.docType,
      version: row.version,
      acceptedAt: row.acceptedAt.toISOString(),
    }));
  }

  /**
   * Record acceptance of the CURRENT version of the given documents (defaults to
   * all). Append-only. Safe to call inside a transaction (pass `session`).
   */
  async recordAcceptances(
    userId: string,
    docTypes: readonly LegalDocType[] = LEGAL_DOC_TYPES,
    ip?: string,
    session?: ClientSession,
  ): Promise<void> {
    for (const docType of docTypes) {
      await this.legalRepository.create(
        {
          userId,
          docType,
          version: CURRENT_LEGAL[docType].version,
          ...(ip ? { ip } : {}),
        },
        session,
      );
    }
  }
}
