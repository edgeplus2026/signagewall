import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { Public } from '../../common/decorators/public.decorator';
import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { ApiSuccessResponse } from '../../common/swagger';
import { PlaybackPdfService } from './playback-pdf.service';

/**
 * Confirms a proof-of-play document was issued here and has not been altered.
 *
 * Deliberately public, and deliberately its own controller. The whole point of
 * the verification block printed on the PDF is that the person holding the
 * document can check it — and that person is the advertiser the report was sent
 * to, who has no account here. Behind the organization guard the instruction
 * printed on the page would be one nobody could follow.
 *
 * Nothing is disclosed by answering: the caller must already hold the digest and
 * the signature, and neither reveals a number, a screen, or a customer. All it
 * says is whether that exact pair was signed by this installation.
 */
@ApiTags('playback')
@Controller('playback')
export class PlaybackVerifyController {
  constructor(private readonly pdf: PlaybackPdfService) {}

  @Public()
  // Rate-limited like the other unauthenticated routes: an open endpoint that
  // performs an HMAC per call should not be a free way to spend our CPU.
  @AuthThrottle()
  @Get('verify')
  @ApiSuccessResponse(Object)
  verify(
    @Query('digest') digest: string,
    @Query('signature') signature: string,
  ) {
    const valid =
      typeof digest === 'string' &&
      typeof signature === 'string' &&
      /^[a-f0-9]{64}$/.test(digest) &&
      /^[a-f0-9]{64}$/.test(signature) &&
      this.pdf.verify(digest, signature);
    return { valid };
  }
}
