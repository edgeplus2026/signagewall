import { Body, Controller, Get, Ip, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthThrottle } from '../../common/decorators/auth-throttle.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  ApiBearerAuthRequired,
  ApiCommonErrorResponses,
  ApiSuccessNullResponse,
  ApiSuccessResponse,
  AuthResponseSchema,
  AuthTokensSchema,
  RegisterResponseSchema,
  UserResponseSchema,
  VerifyEmailResponseSchema,
} from '../../common/swagger';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { AuthService } from './auth.service';
import { AuthTokens } from './auth.tokens';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';

@ApiTags('auth')
@ApiCommonErrorResponses()
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @AuthThrottle()
  @Post('register')
  @ApiSuccessResponse(RegisterResponseSchema)
  register(@Body() dto: RegisterDto, @Ip() ip: string) {
    return this.authService.register(dto, ip);
  }

  @Public()
  @AuthThrottle()
  @Post('login')
  @ApiSuccessResponse(AuthResponseSchema)
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @AuthThrottle()
  @Post('forgot-password')
  @ApiSuccessNullResponse()
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);
    return null;
  }

  @Public()
  @AuthThrottle()
  @Post('reset-password')
  @ApiSuccessNullResponse()
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return null;
  }

  @Public()
  @AuthThrottle()
  @Post('verify-email')
  @ApiSuccessResponse(VerifyEmailResponseSchema)
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }

  @Public()
  @AuthThrottle()
  @Post('resend-verification')
  @ApiSuccessNullResponse()
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto.email);
    return null;
  }

  @Public()
  @AuthThrottle()
  @Post('refresh')
  @ApiSuccessResponse(AuthTokensSchema)
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refreshTokens(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuthRequired()
  @ApiSuccessResponse(UserResponseSchema)
  getMe(@CurrentUser() user: RequestUser) {
    return this.authService.getMe(user.id);
  }

  @Post('logout')
  @ApiBearerAuthRequired()
  @ApiSuccessNullResponse()
  async logout(@CurrentUser() user: RequestUser) {
    await this.authService.logout(user);
    return null;
  }

  @Post('exit-impersonation')
  @ApiBearerAuthRequired()
  @ApiSuccessResponse(AuthResponseSchema)
  exitImpersonation(@CurrentUser() user: RequestUser) {
    return this.authService.exitImpersonation(user);
  }
}
