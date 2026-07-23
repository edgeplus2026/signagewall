import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  OrganizationInvitation,
  OrganizationInvitationDocument,
} from './schemas/organization-invitation.schema';
import { OrganizationRole } from '../organizations/schemas/organization-membership.schema';

@Injectable()
export class MembersRepository {
  constructor(
    @InjectModel(OrganizationInvitation.name)
    private readonly invitationModel: Model<OrganizationInvitationDocument>,
  ) {}

  findPendingByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationInvitationDocument[]> {
    return this.invitationModel
      .find({
        organizationId: new Types.ObjectId(organizationId),
        expiresAt: { $gt: new Date() },
      })
      .exec();
  }

  findPendingById(
    invitationId: string,
  ): Promise<OrganizationInvitationDocument | null> {
    return this.invitationModel
      .findOne({
        _id: invitationId,
      })
      .exec();
  }

  findByTokenHash(
    tokenHash: string,
  ): Promise<OrganizationInvitationDocument | null> {
    return this.invitationModel
      .findOne({
        tokenHash,
        expiresAt: { $gt: new Date() },
      })
      .select('+tokenHash')
      .exec();
  }

  createInvitation(data: {
    organizationId: string;
    email: string;
    name: string;
    role: OrganizationRole;
    invitedBy: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<OrganizationInvitationDocument> {
    return this.invitationModel.create({
      organizationId: new Types.ObjectId(data.organizationId),
      email: data.email.toLowerCase(),
      name: data.name.trim(),
      role: data.role,
      invitedBy: new Types.ObjectId(data.invitedBy),
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
    });
  }

  updateInvitation(
    invitationId: string,
    data: Partial<Pick<OrganizationInvitation, 'name' | 'role'>>,
  ): Promise<OrganizationInvitationDocument | null> {
    return this.invitationModel
      .findByIdAndUpdate(invitationId, data, { returnDocument: 'after' })
      .exec();
  }

  deleteInvitation(
    invitationId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    return this.invitationModel
      .findByIdAndDelete(invitationId, { session })
      .exec()
      .then((invitation) => invitation !== null);
  }

  deleteInvitationsByOrganizationId(organizationId: string): Promise<void> {
    return this.invitationModel
      .deleteMany({ organizationId: new Types.ObjectId(organizationId) })
      .exec()
      .then(() => undefined);
  }
}
