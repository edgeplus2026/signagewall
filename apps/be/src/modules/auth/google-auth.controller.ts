import { Controller, Get, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';

import { Public } from '../../common/decorators/public.decorator';
import { ApiCommonErrorResponses } from '../../common/swagger';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { GoogleProfile } from './strategies/google.strategy';

@ApiTags('auth')
@ApiCommonErrorResponses()
@Controller('auth')
export class GoogleAuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Start Google OAuth',
    description: 'Redirects the browser to Google sign-in.',
  })
  googleLogin(): void {
    // Passport redirects to Google.
  }

  @Public()
  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({
    summary: 'Google OAuth callback',
    description:
      'Handles the Google redirect, issues JWT tokens, and redirects to the frontend callback URL.',
  })
  async googleCallback(
    @Req()
    req: Request & {
      user: GoogleProfile;
    },
    @Res() res: Response,
  ): Promise<void> {
    const authResponse = await this.authService.loginWithGoogle(
      req.user,
      this.readCookie(req.headers.cookie, 'sw_acquisition'),
    );
    res.clearCookie('sw_acquisition', { path: '/api/v1/auth/google' });
    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');

    const redirectUrl = new URL('/auth/google/callback', frontendUrl);
    redirectUrl.searchParams.set(
      'accessToken',
      authResponse.tokens.accessToken,
    );
    redirectUrl.searchParams.set(
      'refreshToken',
      authResponse.tokens.refreshToken,
    );

    res.redirect(redirectUrl.toString());
  }

  private readCookie(
    header: string | undefined,
    name: string,
  ): string | undefined {
    const encoded = header
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1);
    if (!encoded) return undefined;
    try {
      return decodeURIComponent(encoded);
    } catch {
      return undefined;
    }
  }
}
