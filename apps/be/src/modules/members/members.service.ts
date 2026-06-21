import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'crypto';
import { ClientSession } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { MailService } from '../mail/mail.service';
import { OrganizationsRepository } from '../organizations/organizations.repository';
import {
  normalizeOrganizationRole,
  OrganizationMembershipDocument,
  OrganizationRole,
} from '../organizations/schemas/organization-membership.schema';
import { UsersRepository } from '../users/users.repository';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import {
  InvitationPreviewDto,
  MemberResponseDto,
  toMemberFromInvitation,
  toMemberFromMembership,
} from './mappers/member.mapper';
import { MembersRepository } from './members.repository';

@Injectable()
export class MembersService {
  private readonly logger = new Logger(MembersService.name);

  constructor(
    private readonly membersRepository: MembersRepository,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionService,
    private readonly i18n: I18nService,
  ) {}

  async list(
    userId: string,
    organizationId: string,
  ): Promise<MemberResponseDto[]> {
    const memberships =
      await this.organizationsRepository.findMembershipsByOrganizationId(
        organizationId,
      );
    const pendingInvitations =
      await this.membersRepository.findPendingByOrganizationId(organizationId);

    const userIds = memberships.map((membership) =>
      membership.userId.toString(),
    );
    const users = await Promise.all(
      userIds.map((id) => this.usersRepository.findById(id)),
    );
    const userMap = new Map(
      users
        .filter((user) => user !== null)
        .map((user) => [user._id.toString(), user]),
    );

    const approvedMembers = memberships
      .map((membership) => {
        const user = userMap.get(membership.userId.toString());
        if (!user) {
          return null;
        }

        return toMemberFromMembership({
          membershipId: membership._id.toString(),
          name: user.name,
          email: user.email,
          role: membership.role,
          createdAt: membership.createdAt,
        });
      })
      .filter((member): member is MemberResponseDto => member !== null);

    const pendingMembers = pendingInvitations.map(toMemberFromInvitation);

    return [...approvedMembers, ...pendingMembers];
  }

  async invite(
    userId: string,
    organizationId: string,
    dto: InviteMemberDto,
  ): Promise<MemberResponseDto> {
    const email = dto.email.toLowerCase().trim();
    const organization =
      await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw BusinessException.notFound(this.i18n.t('organizations.notFound'));
    }

    const existingMembership =
      await this.organizationsRepository.findMembershipsByOrganizationId(
        organizationId,
      );
    const existingUser = await this.usersRepository.findByEmail(email);

    if (existingUser) {
      const alreadyMember = existingMembership.some(
        (membership) =>
          membership.userId.toString() === existingUser._id.toString(),
      );

      if (alreadyMember) {
        throw BusinessException.conflict(this.i18n.t('members.alreadyMember'));
      }
    }

    const pending =
      await this.membersRepository.findPendingByOrganizationId(organizationId);
    const duplicateInvite = pending.find(
      (invitation) => invitation.email === email,
    );

    if (duplicateInvite) {
      throw BusinessException.conflict(this.i18n.t('members.invitePending'));
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashInviteToken(rawToken);
    const expiresInDays = this.configService.get<number>(
      'auth.inviteExpiresInDays',
      7,
    );
    const expiresAt = new Date(
      Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
    );

    const invitation = await this.membersRepository.createInvitation({
      organizationId,
      email,
      name: dto.name.trim(),
      role: dto.role,
      invitedBy: userId,
      tokenHash,
      expiresAt,
    });

    const frontendUrl = this.configService.getOrThrow<string>('frontendUrl');
    const inviteUrl = existingUser
      ? `${frontendUrl}/accept-invite?invite=${rawToken}`
      : `${frontendUrl}/register?invite=${rawToken}`;

    if (!this.mailService.isEnabled()) {
      this.logger.warn(`Invite link (mail disabled): ${inviteUrl}`);
    }

    void this.mailService
      .sendOrganizationInviteEmail({
        to: email,
        name: dto.name.trim(),
        organizationName: organization.name,
        inviteUrl,
        isExistingUser: Boolean(existingUser),
      })
      .catch((error: unknown) => {
        this.logger.error(`Invite email failed for ${email}`, error);
      });

    return toMemberFromInvitation(invitation);
  }

  async update(
    userId: string,
    organizationId: string,
    memberId: string,
    dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    const membership =
      await this.organizationsRepository.findMembershipById(memberId);

    if (membership && membership.organizationId.toString() === organizationId) {
      return this.updateMembership(organizationId, membership, dto);
    }

    const invitation = await this.membersRepository.findPendingById(memberId);

    if (invitation && invitation.organizationId.toString() === organizationId) {
      const updated = await this.membersRepository.updateInvitation(memberId, {
        ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role } : {}),
      });

      if (!updated) {
        throw BusinessException.notFound(this.i18n.t('members.notFound'));
      }

      return toMemberFromInvitation(updated);
    }

    throw BusinessException.notFound(this.i18n.t('members.notFound'));
  }

  async remove(
    userId: string,
    organizationId: string,
    memberId: string,
  ): Promise<void> {
    const membership =
      await this.organizationsRepository.findMembershipById(memberId);

    if (membership && membership.organizationId.toString() === organizationId) {
      await this.removeMembership(organizationId, membership);
      return;
    }

    const invitation = await this.membersRepository.findPendingById(memberId);

    if (invitation && invitation.organizationId.toString() === organizationId) {
      const deleted = await this.membersRepository.deleteInvitation(memberId);

      if (!deleted) {
        throw BusinessException.notFound(this.i18n.t('members.notFound'));
      }

      return;
    }

    throw BusinessException.notFound(this.i18n.t('members.notFound'));
  }

  async getInvitationPreview(token: string): Promise<InvitationPreviewDto> {
    const tokenHash = this.hashInviteToken(token);
    const invitation = await this.membersRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw BusinessException.badRequest(this.i18n.t('members.invalidInvite'));
    }

    const organization = await this.organizationsRepository.findById(
      invitation.organizationId.toString(),
    );

    if (!organization) {
      throw BusinessException.badRequest(this.i18n.t('members.invalidInvite'));
    }

    const existingUser = await this.usersRepository.findByEmail(
      invitation.email,
    );

    return {
      email: invitation.email,
      organizationName: organization.name,
      organizationId: organization._id.toString(),
      role: normalizeOrganizationRole(invitation.role),
      accountExists: Boolean(existingUser),
    };
  }

  async acceptInvitation(
    userId: string,
    inviteToken: string,
  ): Promise<{ organizationId: string }> {
    return this.transactionService.run((session) =>
      this.acceptInvitationWithSession(userId, inviteToken, session),
    );
  }

  /**
   * Accepts an invitation within a caller-provided transaction. Used by the
   * registration flow so user creation and membership creation commit atomically.
   */
  async acceptInvitationForNewUser(
    userId: string,
    inviteToken: string,
    session: ClientSession,
  ): Promise<string> {
    const result = await this.acceptInvitationWithSession(
      userId,
      inviteToken,
      session,
    );
    return result.organizationId;
  }

  private async acceptInvitationWithSession(
    userId: string,
    inviteToken: string,
    session: ClientSession,
  ): Promise<{ organizationId: string }> {
    const tokenHash = this.hashInviteToken(inviteToken);
    const invitation = await this.membersRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw BusinessException.badRequest(this.i18n.t('members.invalidInvite'));
    }

    const user = await this.usersRepository.findById(userId, { session });

    if (!user || user.email.toLowerCase() !== invitation.email) {
      throw BusinessException.badRequest(
        this.i18n.t('members.inviteEmailMismatch'),
      );
    }

    const existingMembership =
      await this.organizationsRepository.findMembership(
        userId,
        invitation.organizationId.toString(),
        session,
      );

    if (!existingMembership) {
      await this.organizationsRepository.createMembership(
        userId,
        invitation.organizationId.toString(),
        invitation.role,
        session,
      );
    }

    await this.membersRepository.deleteInvitation(
      invitation._id.toString(),
      session,
    );

    return { organizationId: invitation.organizationId.toString() };
  }

  async declineInvitation(userId: string, inviteToken: string): Promise<void> {
    const tokenHash = this.hashInviteToken(inviteToken);
    const invitation = await this.membersRepository.findByTokenHash(tokenHash);

    if (!invitation) {
      throw BusinessException.badRequest(this.i18n.t('members.invalidInvite'));
    }

    const user = await this.usersRepository.findById(userId);

    if (!user || user.email.toLowerCase() !== invitation.email) {
      throw BusinessException.badRequest(
        this.i18n.t('members.inviteEmailMismatch'),
      );
    }

    await this.membersRepository.deleteInvitation(invitation._id.toString());
  }

  private async updateMembership(
    organizationId: string,
    membership: OrganizationMembershipDocument,
    dto: UpdateMemberDto,
  ): Promise<MemberResponseDto> {
    if (dto.role !== undefined) {
      const isDemotingAdmin =
        normalizeOrganizationRole(membership.role) === OrganizationRole.ADMIN &&
        dto.role === OrganizationRole.MEMBER;

      if (isDemotingAdmin) {
        const adminCount =
          await this.organizationsRepository.countAdminsByOrganizationId(
            organizationId,
          );

        if (adminCount <= 1) {
          throw BusinessException.badRequest(
            this.i18n.t('members.cannotRemoveLastAdmin'),
          );
        }
      }

      await this.organizationsRepository.updateMembershipRole(
        membership._id.toString(),
        dto.role,
      );
    }

    const user = await this.usersRepository.findById(
      membership.userId.toString(),
    );

    if (!user) {
      throw BusinessException.notFound(this.i18n.t('members.notFound'));
    }

    if (dto.name !== undefined && dto.name.trim() !== user.name) {
      await this.usersRepository.updateById(user._id.toString(), {
        name: dto.name.trim(),
      });
      user.name = dto.name.trim();
    }

    const updatedMembership =
      (await this.organizationsRepository.findMembershipById(
        membership._id.toString(),
      )) ?? membership;

    return toMemberFromMembership({
      membershipId: updatedMembership._id.toString(),
      name: user.name,
      email: user.email,
      role: updatedMembership.role,
      createdAt: updatedMembership.createdAt,
    });
  }

  private async removeMembership(
    organizationId: string,
    membership: OrganizationMembershipDocument,
  ): Promise<void> {
    const isAdmin =
      normalizeOrganizationRole(membership.role) === OrganizationRole.ADMIN;

    if (isAdmin) {
      const adminCount =
        await this.organizationsRepository.countAdminsByOrganizationId(
          organizationId,
        );

      if (adminCount <= 1) {
        throw BusinessException.badRequest(
          this.i18n.t('members.cannotRemoveLastAdmin'),
        );
      }
    }

    const deleted = await this.organizationsRepository.deleteMembershipById(
      membership._id.toString(),
    );

    if (!deleted) {
      throw BusinessException.notFound(this.i18n.t('members.notFound'));
    }
  }

  private hashInviteToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
