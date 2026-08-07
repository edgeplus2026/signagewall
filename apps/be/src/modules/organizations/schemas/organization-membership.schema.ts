import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type OrganizationMembershipDocument =
  HydratedDocument<OrganizationMembership>;

export enum OrganizationRole {
  /** @deprecated Legacy creator role — normalized to ADMIN in API responses */
  OWNER = 'owner',
  ADMIN = 'admin',
  MEMBER = 'member',
  /** Read-only: sees everything in the organization, changes nothing. */
  VIEWER = 'viewer',
}

export function normalizeOrganizationRole(
  role: OrganizationRole,
): Exclude<OrganizationRole, OrganizationRole.OWNER> {
  return role === OrganizationRole.OWNER ? OrganizationRole.ADMIN : role;
}

@Schema({
  timestamps: true,
  collection: 'organizationmemberships',
})
export class OrganizationMembership {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({
    type: String,
    enum: OrganizationRole,
    default: OrganizationRole.ADMIN,
  })
  role: OrganizationRole;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationMembershipSchema = SchemaFactory.createForClass(
  OrganizationMembership,
);

OrganizationMembershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);
