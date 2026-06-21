import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader } from '@nestjs/swagger';

export const ORGANIZATION_ID_HEADER = 'x-organization-id';

export const ApiBearerAuthRequired = () => ApiBearerAuth();

export const ApiOrganizationHeader = () =>
  ApiHeader({
    name: ORGANIZATION_ID_HEADER,
    description: 'Active organization id for tenant-scoped routes',
    required: true,
  });

export const ApiOrganizationHeaderOptional = () =>
  ApiHeader({
    name: ORGANIZATION_ID_HEADER,
    description: 'Active organization id (optional for user-scoped routes)',
    required: false,
  });

export const ApiOrgScoped = () =>
  applyDecorators(ApiBearerAuthRequired(), ApiOrganizationHeader());

export const ApiOrgScopedOptionalHeader = () =>
  applyDecorators(ApiBearerAuthRequired(), ApiOrganizationHeaderOptional());
