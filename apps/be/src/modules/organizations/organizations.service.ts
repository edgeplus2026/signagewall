import { Injectable } from '@nestjs/common';
import { ClientSession } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import {
  OrganizationResponseDto,
  toOrganizationResponse,
} from './mappers/organization.mapper';
import { OrganizationsRepository } from './organizations.repository';
import {
  OrganizationMembershipDocument,
  OrganizationRole,
} from './schemas/organization-membership.schema';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly transactionService: TransactionService,
    private readonly i18n: I18nService,
  ) {}

  async listForUser(userId: string): Promise<OrganizationResponseDto[]> {
    const items = await this.organizationsRepository.findByUserId(userId);

    return items.map(({ organization, role }) =>
      toOrganizationResponse(organization, role),
    );
  }

  async create(
    userId: string,
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.transactionService.run(async (session) => {
      const created = await this.organizationsRepository.createOrganization(
        dto.name.trim(),
        session,
      );

      await this.organizationsRepository.createMembership(
        userId,
        created._id.toString(),
        OrganizationRole.ADMIN,
        session,
      );

      return created;
    });

    return toOrganizationResponse(organization, OrganizationRole.ADMIN);
  }

  async update(
    organizationId: string,
    membership: OrganizationMembershipDocument,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationsRepository.updateById(
      organizationId,
      dto.name.trim(),
    );

    if (!organization) {
      throw BusinessException.notFound(this.i18n.t('organizations.notFound'));
    }

    return toOrganizationResponse(organization, membership.role);
  }

  async delete(userId: string, organizationId: string): Promise<void> {
    const organizationCount =
      await this.organizationsRepository.countByUserId(userId);

    if (organizationCount <= 1) {
      throw BusinessException.badRequest(
        this.i18n.t('organizations.cannotDeleteLast'),
      );
    }

    const deleted = await this.transactionService.run((session) =>
      this.organizationsRepository.deleteById(organizationId, session),
    );

    if (!deleted) {
      throw BusinessException.notFound(this.i18n.t('organizations.notFound'));
    }
  }

  async deleteOrganizationsForUser(
    userId: string,
    session?: ClientSession,
  ): Promise<void> {
    const items = await this.organizationsRepository.findByUserId(
      userId,
      session,
    );

    for (const { organization } of items) {
      const organizationId = organization._id.toString();
      const memberCount =
        await this.organizationsRepository.countMembersByOrganizationId(
          organizationId,
          session,
        );

      if (memberCount <= 1) {
        await this.organizationsRepository.deleteById(organizationId, session);
      } else {
        await this.organizationsRepository.deleteMembership(
          userId,
          organizationId,
          session,
        );
      }
    }
  }

  async assertMembership(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationResponseDto> {
    const membership = await this.organizationsRepository.findMembership(
      userId,
      organizationId,
    );

    if (!membership) {
      throw BusinessException.forbidden(this.i18n.t('organizations.notMember'));
    }

    const organization =
      await this.organizationsRepository.findById(organizationId);

    if (!organization) {
      throw BusinessException.notFound(this.i18n.t('organizations.notFound'));
    }

    return toOrganizationResponse(organization, membership.role);
  }
}
