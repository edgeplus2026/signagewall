import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';

import {
  Organization,
  OrganizationDocument,
} from './schemas/organization.schema';
import {
  OrganizationInvitation,
  OrganizationInvitationDocument,
} from '../members/schemas/organization-invitation.schema';
import {
  OrganizationMembership,
  OrganizationMembershipDocument,
  OrganizationRole,
} from './schemas/organization-membership.schema';

export interface OrganizationWithRole {
  organization: OrganizationDocument;
  role: OrganizationRole;
}

@Injectable()
export class OrganizationsRepository {
  constructor(
    @InjectModel(Organization.name)
    private readonly organizationModel: Model<OrganizationDocument>,
    @InjectModel(OrganizationMembership.name)
    private readonly membershipModel: Model<OrganizationMembershipDocument>,
    @InjectModel(OrganizationInvitation.name)
    private readonly invitationModel: Model<OrganizationInvitationDocument>,
  ) {}

  async createOrganization(
    name: string,
    ownerUserId: string,
    session?: ClientSession,
  ): Promise<OrganizationDocument> {
    const [organization] = await this.organizationModel.create(
      [{ name, ownerUserId: new Types.ObjectId(ownerUserId) }],
      { session },
    );
    return organization;
  }

  async createMembership(
    userId: string,
    organizationId: string,
    role: OrganizationRole = OrganizationRole.ADMIN,
    session?: ClientSession,
  ): Promise<OrganizationMembershipDocument> {
    const [membership] = await this.membershipModel.create(
      [
        {
          userId: new Types.ObjectId(userId),
          organizationId: new Types.ObjectId(organizationId),
          role,
        },
      ],
      { session },
    );
    return membership;
  }

  async findByUserId(
    userId: string,
    session?: ClientSession,
  ): Promise<OrganizationWithRole[]> {
    const memberships = await this.membershipModel
      .find({ userId: new Types.ObjectId(userId) })
      .session(session ?? null)
      .exec();

    if (memberships.length === 0) {
      return [];
    }

    const organizationIds = memberships.map(
      (membership) => membership.organizationId,
    );
    const organizations = await this.organizationModel
      // Hide orgs queued for deletion (soft-deleted) from every member.
      .find({ _id: { $in: organizationIds }, deletedAt: null })
      .session(session ?? null)
      .exec();

    const organizationMap = new Map(
      organizations.map((organization) => [
        organization._id.toString(),
        organization,
      ]),
    );

    const results: OrganizationWithRole[] = [];

    for (const membership of memberships) {
      const organization = organizationMap.get(
        membership.organizationId.toString(),
      );

      if (organization) {
        results.push({
          organization,
          role: membership.role,
        });
      }
    }

    return results;
  }

  async countByUserId(userId: string): Promise<number> {
    return this.membershipModel
      .countDocuments({ userId: new Types.ObjectId(userId) })
      .exec();
  }

  findMembership(
    userId: string,
    organizationId: string,
    session?: ClientSession,
  ): Promise<OrganizationMembershipDocument | null> {
    return this.membershipModel
      .findOne({
        userId: new Types.ObjectId(userId),
        organizationId: new Types.ObjectId(organizationId),
      })
      .session(session ?? null)
      .exec();
  }

  /** Active (not soft-deleted) org lookup — the access gate. */
  findById(organizationId: string): Promise<OrganizationDocument | null> {
    return this.organizationModel
      .findOne({ _id: new Types.ObjectId(organizationId), deletedAt: null })
      .exec();
  }

  /** Bulk lookup (live orgs only) — e.g. resolving names for a grant list. */
  findManyByIds(organizationIds: string[]): Promise<OrganizationDocument[]> {
    if (organizationIds.length === 0) {
      return Promise.resolve([]);
    }
    return this.organizationModel
      .find({
        _id: { $in: organizationIds.map((id) => new Types.ObjectId(id)) },
        deletedAt: null,
      })
      .exec();
  }

  /** Includes soft-deleted orgs — for the deletion sweep / cancel-deletion. */
  findByIdIncludingDeleted(
    organizationId: string,
  ): Promise<OrganizationDocument | null> {
    return this.organizationModel.findById(organizationId).exec();
  }

  async setDeletedAt(
    organizationId: string,
    deletedAt: Date | null,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.organizationModel
      .findByIdAndUpdate(
        organizationId,
        { deletedAt },
        { returnDocument: 'after' },
      )
      .session(session ?? null)
      .exec();
    return result !== null;
  }

  updateById(
    organizationId: string,
    name: string,
  ): Promise<OrganizationDocument | null> {
    return this.organizationModel
      .findByIdAndUpdate(organizationId, { name }, { returnDocument: 'after' })
      .exec();
  }

  /**
   * Moves billing ownership to the earliest remaining admin when the current
   * owner leaves an organization that survives them.
   *
   * Without this the organization keeps pointing at an account that no longer
   * exists: plan limits resolve through `ownerUserId`, so its screens would
   * either stop being counted against anyone (a free workspace for the
   * remaining team) or fail to resolve at all. No-op when the leaver was not
   * the owner, or when nobody is left to hand it to.
   */
  async transferOwnershipFrom(
    organizationId: string,
    leavingUserId: string,
    session?: ClientSession,
  ): Promise<Types.ObjectId | null> {
    const orgId = new Types.ObjectId(organizationId);
    const leavingId = new Types.ObjectId(leavingUserId);

    const organization = await this.organizationModel
      .findOne({ _id: orgId, ownerUserId: leavingId })
      .session(session ?? null)
      .exec();

    if (!organization) {
      return null;
    }

    const successor = await this.membershipModel
      .findOne({
        organizationId: orgId,
        userId: { $ne: leavingId },
        role: { $in: [OrganizationRole.ADMIN, OrganizationRole.OWNER] },
      })
      .sort({ createdAt: 1, _id: 1 })
      .session(session ?? null)
      .exec();

    if (!successor) {
      return null;
    }

    await this.organizationModel
      .updateOne(
        { _id: orgId },
        { $set: { ownerUserId: successor.userId } },
        { session },
      )
      .exec();

    return successor.userId;
  }

  countMembersByOrganizationId(
    organizationId: string,
    session?: ClientSession,
  ): Promise<number> {
    return this.membershipModel
      .countDocuments({
        organizationId: new Types.ObjectId(organizationId),
      })
      .session(session ?? null)
      .exec();
  }

  deleteMembership(
    userId: string,
    organizationId: string,
    session?: ClientSession,
  ): Promise<void> {
    return this.membershipModel
      .deleteOne(
        {
          userId: new Types.ObjectId(userId),
          organizationId: new Types.ObjectId(organizationId),
        },
        { session },
      )
      .exec()
      .then(() => undefined);
  }

  findMembershipsByOrganizationId(
    organizationId: string,
  ): Promise<OrganizationMembershipDocument[]> {
    return this.membershipModel
      .find({ organizationId: new Types.ObjectId(organizationId) })
      .exec();
  }

  findMembershipById(
    membershipId: string,
  ): Promise<OrganizationMembershipDocument | null> {
    return this.membershipModel.findById(membershipId).exec();
  }

  updateMembershipRole(
    membershipId: string,
    role: OrganizationRole,
  ): Promise<OrganizationMembershipDocument | null> {
    return this.membershipModel
      .findByIdAndUpdate(membershipId, { role }, { returnDocument: 'after' })
      .exec();
  }

  deleteMembershipById(
    membershipId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    return this.membershipModel
      .findByIdAndDelete(membershipId, { session })
      .exec()
      .then((membership) => membership !== null);
  }

  countAdminsByOrganizationId(organizationId: string): Promise<number> {
    return this.membershipModel
      .countDocuments({
        organizationId: new Types.ObjectId(organizationId),
        role: { $in: [OrganizationRole.ADMIN, OrganizationRole.OWNER] },
      })
      .exec();
  }

  async deleteById(
    organizationId: string,
    session?: ClientSession,
  ): Promise<boolean> {
    const result = await this.organizationModel
      .findByIdAndDelete(organizationId, { session })
      .exec();

    if (!result) {
      return false;
    }

    await this.membershipModel
      .deleteMany(
        { organizationId: new Types.ObjectId(organizationId) },
        { session },
      )
      .exec();

    await this.invitationModel
      .deleteMany(
        { organizationId: new Types.ObjectId(organizationId) },
        { session },
      )
      .exec();

    return true;
  }
}
