import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsOptional } from 'class-validator';

import { LEGAL_DOC_TYPES, type LegalDocType } from '../legal.constants';

export class AcceptLegalDto {
  /**
   * Which documents to accept at their current version. Omit to accept every
   * document that currently needs (re-)consent.
   */
  @ApiPropertyOptional({ enum: LEGAL_DOC_TYPES, isArray: true })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(LEGAL_DOC_TYPES, { each: true })
  docTypes?: LegalDocType[];
}
