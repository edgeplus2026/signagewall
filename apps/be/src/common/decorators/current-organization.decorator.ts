import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { ORGANIZATION_ID_HEADER } from '../constants/organization.constants';

function getOrganizationIdFromContext(
  context: ExecutionContext,
): string | undefined {
  const request = context.switchToHttp().getRequest<{
    headers: Record<string, string | string[] | undefined>;
  }>();
  const header = request.headers[ORGANIZATION_ID_HEADER];

  if (!header) {
    return undefined;
  }

  return Array.isArray(header) ? header[0] : header;
}

export const CurrentOrganizationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string | undefined =>
    getOrganizationIdFromContext(context),
);

export const RequiredOrganizationId = createParamDecorator(
  (_data: unknown, context: ExecutionContext): string => {
    const organizationId = getOrganizationIdFromContext(context);

    if (!organizationId) {
      throw new UnauthorizedException('Organization context is required');
    }

    return organizationId;
  },
);
