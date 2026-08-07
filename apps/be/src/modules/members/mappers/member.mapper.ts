import {
  normalizeOrganizationRole,
  OrganizationRole,
} from '../../organizations/schemas/organization-membership.schema';
import { OrganizationInvitationDocument } from '../schemas/organization-invitation.schema';

export type MemberStatus = 'approved' | 'pending';
export type MemberRole =
  | OrganizationRole.ADMIN
  | OrganizationRole.MEMBER
  | OrganizationRole.VIEWER;

export interface MemberResponseDto {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  status: MemberStatus;
  createdAt: string;
}

export interface InvitationPreviewDto {
  email: string;
  organizationName: string;
  organizationId: string;
  role: MemberRole;
  accountExists: boolean;
}

export interface AcceptInvitationResponseDto {
  organizationId: string;
}

export const toMemberFromInvitation = (
  invitation: OrganizationInvitationDocument,
): MemberResponseDto => ({
  id: invitation._id.toString(),
  name: invitation.name,
  email: invitation.email,
  role: normalizeOrganizationRole(invitation.role),
  status: 'pending',
  createdAt: invitation.createdAt.toISOString(),
});

export const toMemberFromMembership = (params: {
  membershipId: string;
  name: string;
  email: string;
  role: OrganizationRole;
  createdAt: Date;
}): MemberResponseDto => ({
  id: params.membershipId,
  name: params.name,
  email: params.email,
  role: normalizeOrganizationRole(params.role),
  status: 'approved',
  createdAt: params.createdAt.toISOString(),
});
