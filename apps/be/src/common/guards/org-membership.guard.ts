import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { I18nService } from 'nestjs-i18n';

import { OrganizationsRepository } from '../../modules/organizations/organizations.repository';
import {
  normalizeOrganizationRole,
  OrganizationMembershipDocument,
  OrganizationRole,
} from '../../modules/organizations/schemas/organization-membership.schema';
import { ORGANIZATION_ID_HEADER } from '../constants/organization.constants';
import {
  ORG_ROLES_KEY,
  OrgRolesMetadata,
} from '../decorators/org-roles.decorator';
import { BusinessException } from '../exceptions/business.exception';
import type { RequestUser } from '../interfaces/request-user.interface';

/** Request key under which the resolved membership is attached. */
export const CURRENT_MEMBERSHIP_KEY = 'organizationMembership';

interface GuardedRequest {
  user?: RequestUser;
  params: Record<string, string>;
  headers: Record<string, string | string[] | undefined>;
  [CURRENT_MEMBERSHIP_KEY]?: OrganizationMembershipDocument;
}

/**
 * Enforces organization-level access declaratively. Reads the {@link
 * RequireOrgRole} metadata, resolves the org id (route param or
 * `x-organization-id` header), loads the caller's membership once, checks the
 * required role, and attaches the membership to the request for downstream
 * `@CurrentMembership()` use.
 *
 * Runs after the global `JwtAuthGuard`, so `request.user` is populated.
 */
@Injectable()
export class OrgMembershipGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly organizationsRepository: OrganizationsRepository,
    private readonly i18n: I18nService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = this.reflector.getAllAndOverride<OrgRolesMetadata>(
      ORG_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No org metadata on this route -> nothing for this guard to enforce.
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<GuardedRequest>();
    const user = request.user;

    if (!user) {
      throw BusinessException.unauthorized(
        this.i18n.t('auth.invalidCredentials'),
      );
    }

    const organizationId = this.resolveOrganizationId(request, metadata);

    if (!organizationId) {
      throw BusinessException.unauthorized(
        this.i18n.t('organizations.organizationRequired'),
      );
    }

    const membership = await this.organizationsRepository.findMembership(
      user.id,
      organizationId,
    );

    if (!membership) {
      throw BusinessException.forbidden(this.i18n.t('organizations.notMember'));
    }

    // Block access to an org queued for deletion (soft-deleted) — findById only
    // returns active orgs, so a missing org here means it's pending deletion.
    const organization =
      await this.organizationsRepository.findById(organizationId);
    if (!organization) {
      throw BusinessException.forbidden(this.i18n.t('organizations.notMember'));
    }

    if (this.requiresAdmin(metadata.roles)) {
      if (
        normalizeOrganizationRole(membership.role) !== OrganizationRole.ADMIN
      ) {
        throw BusinessException.forbidden(
          this.i18n.t('organizations.adminOnly'),
        );
      }
    }

    request[CURRENT_MEMBERSHIP_KEY] = membership;
    return true;
  }

  private resolveOrganizationId(
    request: GuardedRequest,
    metadata: OrgRolesMetadata,
  ): string | undefined {
    if (metadata.idParam) {
      return request.params?.[metadata.idParam];
    }

    const header = request.headers[ORGANIZATION_ID_HEADER];
    if (!header) {
      return undefined;
    }

    return Array.isArray(header) ? header[0] : header;
  }

  private requiresAdmin(roles?: OrganizationRole[]): boolean {
    return (roles ?? []).some(
      (role) => normalizeOrganizationRole(role) === OrganizationRole.ADMIN,
    );
  }
}
