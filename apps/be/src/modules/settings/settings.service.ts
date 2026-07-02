import { Injectable, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { RequestUser } from '../../common/interfaces/request-user.interface';
import { AuthService } from '../auth/auth.service';
import { DataDeletionService } from '../data-deletion/data-deletion.service';
import { LegalService } from '../legal/legal.service';
import { MailService } from '../mail/mail.service';
import { SupportEmailContext } from '../mail/templates/support-email.template';
import { OrganizationsService } from '../organizations/organizations.service';
import { toUserResponse, UserResponseDto } from '../users/mappers/user.mapper';
import { UsersRepository } from '../users/users.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { SetPasswordDto } from './dto/set-password.dto';
import { FeedbackDto } from './dto/feedback.dto';
import { ReportProblemDto } from './dto/report-problem.dto';
import { UpdateAccountSettingsDto } from './dto/update-account-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

export interface AccountSettingsDto {
  language: 'en' | 'sr';
  theme: 'light' | 'dark' | 'system';
}

/** Full personal-data export served for the GDPR right of access. */
export interface DataExportDto {
  exportedAt: string;
  profile: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    company?: string;
    provider: string;
    language: string;
    theme: string;
    createdAt: string;
  };
  organizations: { id: string; name: string; role: string }[];
  legalAcceptances: { docType: string; version: string; acceptedAt: string }[];
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly authService: AuthService,
    private readonly organizationsService: OrganizationsService,
    private readonly legalService: LegalService,
    private readonly dataDeletionService: DataDeletionService,
    private readonly mailService: MailService,
    private readonly i18n: I18nService,
  ) {}

  /** GDPR right of access: everything personal we hold about the user. */
  async exportUserData(userId: string): Promise<DataExportDto> {
    const user = await this.usersRepository.findById(userId);
    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const [organizations, legalAcceptances] = await Promise.all([
      this.organizationsService.listForUser(userId),
      this.legalService.listAcceptances(userId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      profile: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        ...(user.phone ? { phone: user.phone } : {}),
        ...(user.company ? { company: user.company } : {}),
        provider: user.provider,
        language: user.language,
        theme: user.theme,
        createdAt: user.createdAt.toISOString(),
      },
      organizations: organizations.map((org) => ({
        id: org.id,
        name: org.name,
        role: org.role,
      })),
      legalAcceptances,
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersRepository.updateById(userId, {
      name: dto.name.trim(),
      phone: dto.phone,
      company: dto.company?.trim(),
    });

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    const userWithPassword = await this.usersRepository.findById(userId, {
      select: ['password'],
    });

    return toUserResponse(user, Boolean(userWithPassword?.password));
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    await this.authService.changePassword(
      userId,
      dto.currentPassword,
      dto.password,
    );
  }

  async setPassword(userId: string, dto: SetPasswordDto): Promise<void> {
    await this.authService.setPassword(userId, dto.password);
  }

  async getSettings(userId: string): Promise<AccountSettingsDto> {
    const user = await this.usersRepository.findById(userId);

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    return {
      language: user.language as AccountSettingsDto['language'],
      theme: user.theme as AccountSettingsDto['theme'],
    };
  }

  async updateSettings(
    userId: string,
    dto: UpdateAccountSettingsDto,
  ): Promise<AccountSettingsDto> {
    const user = await this.usersRepository.updateById(userId, {
      ...(dto.language ? { language: dto.language } : {}),
      ...(dto.theme ? { theme: dto.theme } : {}),
    });

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('auth.userNotFound'));
    }

    return {
      language: user.language as AccountSettingsDto['language'],
      theme: user.theme as AccountSettingsDto['theme'],
    };
  }

  /**
   * GDPR erasure: starts the 30-day deletion grace period (deactivates the
   * account + revokes sessions now; the sweep anonymizes later). Rejected if the
   * user solely owns an org with other members — see {@link DataDeletionService}.
   */
  async deleteAccount(userId: string): Promise<{ scheduledFor: string }> {
    return this.dataDeletionService.requestAccountDeletion(userId);
  }

  async submitFeedback(
    user: RequestUser,
    organizationId: string | undefined,
    dto: FeedbackDto,
  ): Promise<void> {
    const context = await this.resolveSupportContext(user, organizationId);

    await this.mailService.sendFeedbackEmail({
      context,
      rating: dto.rating,
      message: dto.message.trim(),
    });

    this.logger.log(
      `Feedback from ${user.email}: rating=${dto.rating} org=${context.organizationId}`,
    );
  }

  async reportProblem(
    user: RequestUser,
    organizationId: string | undefined,
    dto: ReportProblemDto,
  ): Promise<void> {
    const context = await this.resolveSupportContext(user, organizationId);

    await this.mailService.sendReportProblemEmail({
      context,
      message: dto.message.trim(),
    });

    this.logger.log(
      `Problem report from ${user.email}: org=${context.organizationId}`,
    );
  }

  private async resolveSupportContext(
    user: RequestUser,
    organizationId?: string,
  ): Promise<SupportEmailContext> {
    if (!organizationId) {
      return {
        userName: user.name,
        userEmail: user.email,
        organizationId: '—',
        organizationName: '—',
      };
    }

    try {
      const organization = await this.organizationsService.assertMembership(
        user.id,
        organizationId,
      );

      return {
        userName: user.name,
        userEmail: user.email,
        organizationId: organization.id,
        organizationName: organization.name,
      };
    } catch {
      return {
        userName: user.name,
        userEmail: user.email,
        organizationId,
        organizationName: '—',
      };
    }
  }
}
