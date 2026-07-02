import { Body, Controller, Get, Ip, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { AcceptLegalDto } from './dto/accept-legal.dto';
import { LegalService } from './legal.service';

@ApiTags('legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /** Public: the current Terms/Privacy documents for a locale. */
  @Public()
  @Get('documents')
  getDocuments(@Query('locale') locale?: string) {
    return this.legalService.getDocuments(locale);
  }

  /** Which current documents the signed-in user still needs to accept. */
  @Get('acceptance-status')
  getAcceptanceStatus(@CurrentUser() user: RequestUser) {
    return this.legalService.getAcceptanceStatus(user.id);
  }

  /** Accept the current version of the given documents (defaults to all). */
  @Post('accept')
  async accept(
    @CurrentUser() user: RequestUser,
    @Body() dto: AcceptLegalDto,
    @Ip() ip: string,
  ) {
    await this.legalService.recordAcceptances(user.id, dto.docTypes, ip);
    return this.legalService.getAcceptanceStatus(user.id);
  }
}
