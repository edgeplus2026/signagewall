import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { Model, Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import {
  PendingDeletion,
  PendingDeletionDocument,
} from '../data-deletion/schemas/pending-deletion.schema';
import { LegalService } from '../legal/legal.service';
import { MembersService } from '../members/members.service';
import { MailService } from '../mail/mail.service';
import {
  AuthProvider,
  UserDocument,
  UserRole,
} from '../users/schemas/user.schema';
import { toUserResponse, UserResponseDto } from '../users/mappers/user.mapper';
import { UsersRepository } from '../users/users.repository';
import { AuthTokensService, AuthTokens } from './auth.tokens';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { GoogleProfile } from './strategies/google.strategy';

export interface AuthResponseDto {
  user: UserResponseDto;
  tokens: AuthTokens;
}

export interface RegisterPendingDto {
  needsVerification: true;
  email: string;
}

export type RegisterResultDto = AuthResponseDto | RegisterPendingDto;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly bcryptRounds = 10;

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authTokensService: AuthTokensService,
    private readonly configService: ConfigService,
    private readonly mailService: MailService,
    private readonly membersService: MembersService,
    private readonly transactionService: TransactionService,
    private readonly legalService: LegalService,
    @InjectModel(PendingDeletion.name)
    private readonly pendingDeletionModel: Model<PendingDeletionDocument>,
    private readonly i18n: I18nService,
  ) {}

  isGoogleAuthEnabled(): boolean {
    return Boolean(
      this.configService.get('google.clientId') &&
      this.configService.get('google.clientSecret'),
    );
  }

  async register(dto: RegisterDto, ip?: string): Promise<RegisterResultDto> {
    if (dto.inviteToken) {
      const preview = await this.membersService.getInvitationPreview(
        dto.inviteToken,
      );

      if (preview.email.toLowerCase() !== dto.email.toLowerCase()) {
        throw BusinessException.badRequest(
          this.i18n.t('members.inviteEmailMismatch'),
        );
      }
    }

    const existing = await this.usersRepository.findByEmail(dto.email);
    if (existing) {
      throw BusinessException.conflict(this.i18n.t('auth.emailAlreadyExists'));
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);
    const userData = {
      name: dto.name.trim(),
      email: dto.email,
      phone: dto.phone,
      company: dto.company?.trim(),
      password: hashedPassword,
      provider: AuthProvider.LOCAL,
    };

    if (dto.inviteToken) {
      const inviteToken = dto.inviteToken;
      // Invited users already proved email ownership via the invite link and
      // were vetted by the org owner, so they skip verification and log in
      // immediately. Create the user and accept the invitation atomically: a
      // failure in either step rolls back both, so we never leave an orphaned
      // account.
      const user = await this.transactionService.run(async (session) => {
        const created = await this.usersRepository.create(
          { ...userData, isEmailVerified: true },
          session,
        );
        await this.membersService.acceptInvitationForNewUser(
          created._id.toString(),
          inviteToken,
          session,
        );
        await this.legalService.recordAcceptances(
          created._id.toString(),
          undefined,
          ip,
          session,
        );
        return created;
      });

      this.notifyAdminOfRegistration(dto, true);
      return this.buildAuthResponse(user);
    }

    // Standard sign-up: the account stays unverified and receives no tokens.
    // The user must confirm their email before they can log in. The token is
    // persisted before sending, so a mail failure must not fail registration —
    // the user can still request a fresh link via resend.
    const user = await this.usersRepository.create(userData);
    // Best-effort: consent is already enforced by the DTO, so a write failure
    // here must not fail registration and orphan the just-created user (which
    // would then block re-registration with "email already exists").
    await this.legalService
      .recordAcceptances(user._id.toString(), undefined, ip)
      .catch((error: unknown) => {
        this.logger.error(
          `Recording legal consent failed for ${user.email}`,
          error,
        );
      });
    this.notifyAdminOfRegistration(dto, false);
    await this.sendVerificationLink(user).catch((error: unknown) => {
      this.logger.error(`Verification email failed for ${user.email}`, error);
    });

    return { needsVerification: true, email: user.email };
  }

  /**
   * Fire-and-forget internal notification to the Edge team that a new user
   * signed up, echoing what they entered on the form (never the password). Must
   * never block or fail registration on a mail error.
   */
  private notifyAdminOfRegistration(
    dto: RegisterDto,
    viaInvite: boolean,
  ): void {
    void this.mailService
      .sendNewRegistrationEmail({
        name: dto.name.trim(),
        email: dto.email,
        phone: dto.phone,
        ...(dto.company?.trim() ? { company: dto.company.trim() } : {}),
        viaInvite,
      })
      .catch((error: unknown) => {
        this.logger.error(
          `Registration notification failed for ${dto.email}`,
          error,
        );
      });
  }

  /**
   * Generates a single-use verification token, persists its hash with an
   * expiry, and emails the user a verification link. Only the hash is stored;
   * the raw token lives solely in the emailed link.
   */
  private async sendVerificationLink(user: UserDocument): Promise<void> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);
    const expiresInHours = this.configService.get<number>(
      'auth.emailVerificationExpiresInHours',
      24,
    );
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

    await this.usersRepository.updateById(user._id.toString(), {
      emailVerificationToken: tokenHash,
      emailVerificationExpiresAt: expiresAt,
    });

    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${rawToken}`;

    if (!this.mailService.isEnabled()) {
      this.logger.warn(`Email verification link (mail disabled): ${verifyUrl}`);
    }

    await this.mailService.sendEmailVerificationEmail({
      to: user.email,
      name: user.name,
      verifyUrl,
    });
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersRepository.findByEmail(dto.email, {
      select: ['password'],
    });

    if (!user || !user.password) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    // Verify the password before the active-check so an account in its
    // self-deletion grace period can reactivate by simply logging in.
    const isValid = await bcrypt.compare(dto.password, user.password);
    if (!isValid) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    if (!user.isActive) {
      // Only a pending self-deletion (still in grace) may self-reactivate;
      // admin-deactivated accounts stay locked out.
      const reactivated = await this.reactivatePendingDeletion(
        user._id.toString(),
      );
      if (!reactivated) {
        throw BusinessException.unauthorized(
          this.i18n.t('auth.invalidCredentials'),
        );
      }
      user.isActive = true;
    }

    // Credentials are valid but the email is unconfirmed. Use a distinct
    // 403 + message so the client can offer to resend the verification link.
    if (!user.isEmailVerified) {
      throw BusinessException.forbidden(this.i18n.t('auth.emailNotVerified'));
    }

    return this.buildAuthResponse(user);
  }

  /**
   * Cancel a pending account deletion when the user logs back in during the
   * 30-day grace period, restoring the account. Returns false when no pending
   * self-deletion exists (e.g. an admin-deactivated account), which must stay
   * locked out.
   */
  private async reactivatePendingDeletion(userId: string): Promise<boolean> {
    const pending = await this.pendingDeletionModel
      .findOne({
        type: 'account',
        targetId: new Types.ObjectId(userId),
        status: 'pending',
      })
      .exec();

    if (!pending) {
      return false;
    }

    await this.usersRepository.reactivate(userId);
    await this.pendingDeletionModel.deleteOne({ _id: pending._id }).exec();
    this.logger.log(
      `Account ${userId} reactivated by login within grace period`,
    );
    return true;
  }

  async verifyEmail(token: string): Promise<{ verified: true }> {
    const tokenHash = this.hashToken(token);
    const user =
      await this.usersRepository.findByEmailVerificationTokenHash(tokenHash);

    if (!user) {
      throw BusinessException.badRequest(
        this.i18n.t('auth.invalidVerificationToken'),
      );
    }

    // Idempotent: a second click on a still-valid link is a no-op success.
    if (!user.isEmailVerified) {
      await this.usersRepository.updateById(user._id.toString(), {
        isEmailVerified: true,
        emailVerificationToken: undefined,
        emailVerificationExpiresAt: undefined,
      });

      const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
      void this.mailService
        .sendWelcomeEmail({
          to: user.email,
          name: user.name,
          loginUrl: `${frontendUrl}/login`,
        })
        .catch((error: unknown) => {
          this.logger.error(`Welcome email failed for ${user.email}`, error);
        });
    }

    return { verified: true };
  }

  async resendVerification(email: string): Promise<void> {
    const user = await this.usersRepository.findByEmail(email);

    // Mirror forgotPassword: never reveal whether the account exists.
    if (user && user.isActive && !user.isEmailVerified) {
      await this.sendVerificationLink(user);
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersRepository.findByEmail(dto.email);

    if (
      this.configService.get('nodeEnv') === 'development' &&
      (!user || !user.isActive || !user.password)
    ) {
      this.logger.warn(
        `Forgot password: no email sent for "${dto.email}" ` +
          '(account missing, inactive, or signed up without a password)',
      );
    }

    if (user && user.isActive && user.password) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = this.hashToken(rawToken);
      const expiresInHours = this.configService.get<number>(
        'auth.passwordResetExpiresInHours',
        1,
      );
      const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);

      await this.usersRepository.updateById(user._id.toString(), {
        passwordResetToken: tokenHash,
        passwordResetExpiresAt: expiresAt,
      });

      const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
      const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

      if (!this.mailService.isEnabled()) {
        this.logger.warn(`Password reset link (mail disabled): ${resetUrl}`);
      }

      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
      });
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token);
    const user =
      await this.usersRepository.findByPasswordResetTokenHash(tokenHash);

    if (!user) {
      throw BusinessException.badRequest(this.i18n.t('auth.invalidResetToken'));
    }

    const hashedPassword = await bcrypt.hash(dto.password, this.bcryptRounds);

    await this.usersRepository.updateById(user._id.toString(), {
      password: hashedPassword,
      passwordResetToken: undefined,
      passwordResetExpiresAt: undefined,
      refreshTokenHash: undefined,
    });
  }

  async refreshTokens(refreshToken: string): Promise<AuthTokens> {
    let payload: import('./auth.tokens').TokenPayload;

    try {
      payload = await this.authTokensService.verifyRefreshToken(refreshToken);
    } catch {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const user = await this.usersRepository.findById(payload.sub);

    if (!user || !user.isActive) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    if (payload.impersonatorId) {
      const impersonator = await this.usersRepository.findById(
        payload.impersonatorId,
      );

      if (
        !impersonator?.isActive ||
        impersonator.role !== UserRole.SUPER_ADMIN
      ) {
        throw BusinessException.unauthorized(
          this.i18n.t('auth.invalidCredentials'),
        );
      }

      return this.authTokensService.generateTokens(
        user._id.toString(),
        user.email,
        { impersonatorId: payload.impersonatorId },
      );
    }

    const userWithRefresh = await this.usersRepository.findById(payload.sub, {
      select: ['refreshTokenHash'],
    });

    if (!userWithRefresh?.refreshTokenHash) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const isValid = await this.authTokensService.compareRefreshToken(
      refreshToken,
      userWithRefresh.refreshTokenHash,
    );

    if (!isValid) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const tokens = await this.authTokensService.generateTokens(
      user._id.toString(),
      user.email,
    );
    const refreshTokenHash = await this.authTokensService.hashRefreshToken(
      tokens.refreshToken,
    );

    await this.usersRepository.updateRefreshTokenHash(
      user._id.toString(),
      refreshTokenHash,
    );

    return tokens;
  }

  async getMe(userId: string): Promise<UserResponseDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user || !user.isActive) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    return this.mapUserResponse(user);
  }

  async logout(user: RequestUser): Promise<void> {
    if (user.impersonatorId) {
      return;
    }

    await this.usersRepository.updateRefreshTokenHash(user.id, null);
  }

  async exitImpersonation(user: RequestUser): Promise<AuthResponseDto> {
    if (!user.impersonatorId) {
      throw BusinessException.badRequest(this.i18n.t('auth.notImpersonating'));
    }

    const impersonator = await this.usersRepository.findById(
      user.impersonatorId,
    );

    if (!impersonator?.isActive || impersonator.role !== UserRole.SUPER_ADMIN) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    this.logger.log(
      `Super-admin ${user.impersonatorId} exited impersonation of user ${user.id}`,
    );

    return this.buildAuthResponse(impersonator);
  }

  async loginWithGoogle(profile: GoogleProfile): Promise<AuthResponseDto> {
    let user =
      (await this.usersRepository.findByGoogleId(profile.googleId)) ??
      (await this.usersRepository.findByEmail(profile.email));

    if (user && !user.isActive) {
      // Same self-reactivation as password login: signing back in during the
      // 30-day grace period restores an account pending self-deletion (Google
      // has proven identity); admin-disabled accounts stay blocked.
      const reactivated = await this.reactivatePendingDeletion(
        user._id.toString(),
      );
      if (!reactivated) {
        throw BusinessException.forbidden(this.i18n.t('auth.accountDisabled'));
      }
      user.isActive = true;
    }

    if (!user) {
      user = await this.usersRepository.create({
        name: profile.name,
        email: profile.email,
        googleId: profile.googleId,
        provider: AuthProvider.GOOGLE,
        // Google has already verified ownership of the email address.
        isEmailVerified: true,
      });
    } else if (!user.googleId) {
      // Linking Google to an existing account. Signing in through Google
      // proves ownership of the email, so verify the account if it wasn't.
      const updated = await this.usersRepository.updateById(
        user._id.toString(),
        {
          googleId: profile.googleId,
          provider: AuthProvider.GOOGLE,
          isEmailVerified: true,
        },
      );
      if (updated) {
        user = updated;
      }
    }

    if (!user) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.googleAuthFailed'),
      );
    }

    return this.buildAuthResponse(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersRepository.findById(userId, {
      select: ['password'],
    });

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    if (!user.password) {
      throw BusinessException.badRequest(this.i18n.t('auth.noPasswordSet'));
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    await this.usersRepository.updateById(userId, {
      password: hashedPassword,
      refreshTokenHash: undefined,
    });
  }

  async setPassword(userId: string, newPassword: string): Promise<void> {
    const user = await this.usersRepository.findById(userId, {
      select: ['password'],
    });

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    if (user.password) {
      throw BusinessException.badRequest(
        this.i18n.t('auth.passwordAlreadySet'),
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, this.bcryptRounds);

    await this.usersRepository.updateById(userId, {
      password: hashedPassword,
      refreshTokenHash: undefined,
    });
  }

  private async mapUserResponse(user: UserDocument): Promise<UserResponseDto> {
    const userWithPassword = await this.usersRepository.findById(
      user._id.toString(),
      { select: ['password'] },
    );

    return toUserResponse(user, Boolean(userWithPassword?.password));
  }

  private async buildAuthResponse(
    user: UserDocument,
  ): Promise<AuthResponseDto> {
    const userId = user._id.toString();
    const tokens = await this.authTokensService.generateTokens(
      userId,
      user.email,
    );
    const refreshTokenHash = await this.authTokensService.hashRefreshToken(
      tokens.refreshToken,
    );

    await this.usersRepository.updateRefreshTokenHash(userId, refreshTokenHash);

    return {
      user: await this.mapUserResponse(user),
      tokens,
    };
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
