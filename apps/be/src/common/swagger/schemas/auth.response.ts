import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { UserResponseSchema } from './user.response';

export class AuthTokensSchema {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;
}

export class AuthResponseSchema {
  @ApiProperty({ type: UserResponseSchema })
  user: UserResponseSchema;

  @ApiProperty({ type: AuthTokensSchema })
  tokens: AuthTokensSchema;
}

/**
 * Register returns one of two shapes:
 *  - an authenticated session ({ user, tokens }) for invited users, or
 *  - a pending-verification marker ({ needsVerification, email }) for
 *    standard sign-ups that must confirm their email first.
 * All fields are optional so the generated client can narrow on
 * `needsVerification`.
 */
export class RegisterResponseSchema {
  @ApiPropertyOptional({ type: UserResponseSchema })
  user?: UserResponseSchema;

  @ApiPropertyOptional({ type: AuthTokensSchema })
  tokens?: AuthTokensSchema;

  @ApiPropertyOptional({ enum: [true] })
  needsVerification?: true;

  @ApiPropertyOptional()
  email?: string;
}

export class VerifyEmailResponseSchema {
  @ApiProperty({ enum: [true] })
  verified: true;
}
