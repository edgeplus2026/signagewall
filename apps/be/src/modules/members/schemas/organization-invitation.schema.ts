import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

import { OrganizationRole } from '../../organizations/schemas/organization-membership.schema';

export type OrganizationInvitationDocument =
  HydratedDocument<OrganizationInvitation>;

@Schema({
  timestamps: true,
  collection: 'organizationinvitations',
})
export class OrganizationInvitation {
  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string;

  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, enum: OrganizationRole, default: OrganizationRole.MEMBER })
  role: OrganizationRole;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ required: true, select: false })
  tokenHash: string;

  @Prop({ required: true })
  expiresAt: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const OrganizationInvitationSchema = SchemaFactory.createForClass(
  OrganizationInvitation,
);

OrganizationInvitationSchema.index(
  { organizationId: 1, email: 1 },
  { unique: true },
);
OrganizationInvitationSchema.index({ tokenHash: 1 });
