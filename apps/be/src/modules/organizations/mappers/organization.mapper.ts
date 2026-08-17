import { OrganizationDocument } from '../schemas/organization.schema';
import {
  normalizeOrganizationRole,
  OrganizationRole,
} from '../schemas/organization-membership.schema';

export type OrganizationRoleDto =
  | OrganizationRole.ADMIN
  | OrganizationRole.MEMBER
  | OrganizationRole.VIEWER;

export interface OrganizationResponseDto {
  id: string;
  name: string;
  role: OrganizationRoleDto;
}

export const toOrganizationResponse = (
  organization: OrganizationDocument,
  role: OrganizationRole,
): OrganizationResponseDto => ({
  id: organization._id.toString(),
  name: organization.name,
  role: normalizeOrganizationRole(role),
});
