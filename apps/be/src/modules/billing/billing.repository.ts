import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import {
  BillingAccount,
  BillingAccountDocument,
  BillingAccountStatus,
  BillingInterval,
} from './schemas/billing-account.schema';
import {
  ManualInvoice,
  ManualInvoiceActivityType,
  ManualInvoiceDocument,
  ManualInvoiceStatus,
} from './schemas/manual-invoice.schema';

export interface EnsureBillingAccountData {
  ownerUserId: string;
  companyName?: string;
  billingEmail: string;
  screenQuantity: number;
  status: BillingAccountStatus;
  actorUserId: string;
}

export interface CreateManualInvoiceData {
  billingAccountId: string;
  customerUserId: string;
  customerName: string;
  companyName?: string;
  billingEmail?: string;
  invoiceNumber?: string;
  amountMinor?: number;
  currency?: string;
  screenQuantity: number;
  servicePeriodStart?: Date;
  servicePeriodEnd?: Date;
  dueAt?: Date;
  note?: string;
  actorUserId: string;
}

export interface UpdateManualInvoiceData {
  companyName?: string;
  billingEmail?: string;
  invoiceNumber?: string;
  amountMinor?: number;
  currency?: string;
  screenQuantity?: number;
  servicePeriodStart?: Date;
  servicePeriodEnd?: Date;
  dueAt?: Date;
  note?: string;
}

export interface OutstandingAmount {
  currency: string;
  amountMinor: number;
}

@Injectable()
export class BillingRepository {
  constructor(
    @InjectModel(BillingAccount.name)
    private readonly billingAccountModel: Model<BillingAccountDocument>,
    @InjectModel(ManualInvoice.name)
    private readonly invoiceModel: Model<ManualInvoiceDocument>,
  ) {}

  ensureAccount(
    data: EnsureBillingAccountData,
  ): Promise<BillingAccountDocument> {
    const ownerUserId = new Types.ObjectId(data.ownerUserId);
    const actorUserId = new Types.ObjectId(data.actorUserId);

    return this.billingAccountModel
      .findOneAndUpdate(
        { ownerUserId },
        {
          $setOnInsert: {
            ownerUserId,
            companyName: data.companyName,
            billingEmail: data.billingEmail.toLowerCase(),
            status: data.status,
            billingInterval: BillingInterval.MONTHLY,
            screenQuantity: data.screenQuantity,
            currentPeriodStart: null,
            currentPeriodEnd: null,
            graceEndsAt: null,
            trialConsumedAt: new Date(),
            createdBy: actorUserId,
            updatedBy: actorUserId,
          },
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
      )
      .orFail()
      .exec();
  }

  findAccountById(id: string): Promise<BillingAccountDocument | null> {
    return this.billingAccountModel.findById(id).exec();
  }

  findAccountByOwner(
    ownerUserId: string,
  ): Promise<BillingAccountDocument | null> {
    return this.billingAccountModel
      .findOne({ ownerUserId: new Types.ObjectId(ownerUserId) })
      .exec();
  }

  updateAccount(
    id: string,
    data: Partial<BillingAccount>,
    actorUserId?: string,
  ): Promise<BillingAccountDocument | null> {
    return this.billingAccountModel
      .findByIdAndUpdate(
        id,
        {
          $set: {
            ...data,
            ...(actorUserId
              ? { updatedBy: new Types.ObjectId(actorUserId) }
              : {}),
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  findAccountsByStatuses(
    statuses: BillingAccountStatus[],
  ): Promise<BillingAccountDocument[]> {
    return this.billingAccountModel
      .find({ status: { $in: statuses } })
      .sort({ currentPeriodEnd: 1, createdAt: 1 })
      .exec();
  }

  countAccounts(status?: BillingAccountStatus): Promise<number> {
    return this.billingAccountModel
      .countDocuments(status ? { status } : {})
      .exec();
  }

  createInvoice(data: CreateManualInvoiceData): Promise<ManualInvoiceDocument> {
    const actorUserId = new Types.ObjectId(data.actorUserId);

    return this.invoiceModel.create({
      billingAccountId: new Types.ObjectId(data.billingAccountId),
      customerUserId: new Types.ObjectId(data.customerUserId),
      customerName: data.customerName.trim(),
      companyName: data.companyName?.trim(),
      billingEmail: data.billingEmail?.trim().toLowerCase(),
      invoiceNumber: data.invoiceNumber?.trim(),
      amountMinor: data.amountMinor,
      currency: data.currency?.trim().toUpperCase(),
      screenQuantity: data.screenQuantity,
      servicePeriodStart: data.servicePeriodStart ?? null,
      servicePeriodEnd: data.servicePeriodEnd ?? null,
      dueAt: data.dueAt ?? null,
      status: ManualInvoiceStatus.DRAFT,
      note: data.note?.trim(),
      sentAt: null,
      sentBy: null,
      paidAt: null,
      paidBy: null,
      voidedAt: null,
      voidedBy: null,
      archivedAt: null,
      archivedBy: null,
      createdBy: actorUserId,
      updatedBy: actorUserId,
      activity: [
        {
          type: ManualInvoiceActivityType.CREATED,
          actorUserId,
          occurredAt: new Date(),
        },
      ],
    });
  }

  findInvoiceById(id: string): Promise<ManualInvoiceDocument | null> {
    return this.invoiceModel
      .findOne({ _id: new Types.ObjectId(id), archivedAt: null })
      .exec();
  }

  async listInvoices(params: {
    page: number;
    limit: number;
    status?: ManualInvoiceStatus;
  }): Promise<{ items: ManualInvoiceDocument[]; total: number }> {
    const filter = {
      archivedAt: null,
      ...(params.status ? { status: params.status } : {}),
    };
    const skip = (params.page - 1) * params.limit;

    const [items, total] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(params.limit)
        .exec(),
      this.invoiceModel.countDocuments(filter).exec(),
    ]);

    return { items, total };
  }

  updateDraft(
    id: string,
    data: UpdateManualInvoiceData,
    actorUserId: string,
  ): Promise<ManualInvoiceDocument | null> {
    const actor = new Types.ObjectId(actorUserId);

    return this.invoiceModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: ManualInvoiceStatus.DRAFT,
          archivedAt: null,
        },
        {
          $set: { ...data, updatedBy: actor },
          $push: {
            activity: {
              type: ManualInvoiceActivityType.UPDATED,
              actorUserId: actor,
              occurredAt: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  transitionInvoice(params: {
    id: string;
    from: ManualInvoiceStatus[];
    to: ManualInvoiceStatus;
    set: Record<string, unknown>;
    activityType: ManualInvoiceActivityType;
    actorUserId?: string;
    note?: string;
  }): Promise<ManualInvoiceDocument | null> {
    const actor = params.actorUserId
      ? new Types.ObjectId(params.actorUserId)
      : null;

    return this.invoiceModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(params.id),
          status: { $in: params.from },
          archivedAt: null,
        },
        {
          $set: {
            status: params.to,
            ...params.set,
            ...(actor ? { updatedBy: actor } : {}),
          },
          $push: {
            activity: {
              type: params.activityType,
              actorUserId: actor,
              occurredAt: new Date(),
              ...(params.note ? { note: params.note.trim() } : {}),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  archiveInvoice(
    id: string,
    actorUserId: string,
  ): Promise<ManualInvoiceDocument | null> {
    const actor = new Types.ObjectId(actorUserId);

    return this.invoiceModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          status: {
            $in: [ManualInvoiceStatus.PAID, ManualInvoiceStatus.VOID],
          },
          archivedAt: null,
        },
        {
          $set: {
            archivedAt: new Date(),
            archivedBy: actor,
            updatedBy: actor,
          },
          $push: {
            activity: {
              type: ManualInvoiceActivityType.ARCHIVED,
              actorUserId: actor,
              occurredAt: new Date(),
            },
          },
        },
        { returnDocument: 'after' },
      )
      .exec();
  }

  findInvoicesByStatuses(
    statuses: ManualInvoiceStatus[],
  ): Promise<ManualInvoiceDocument[]> {
    return this.invoiceModel
      .find({ status: { $in: statuses }, archivedAt: null })
      .sort({ dueAt: 1, createdAt: 1 })
      .exec();
  }

  findSentInvoicesDueBefore(date: Date): Promise<ManualInvoiceDocument[]> {
    return this.invoiceModel
      .find({
        status: ManualInvoiceStatus.SENT,
        dueAt: { $ne: null, $lt: date },
        archivedAt: null,
      })
      .sort({ dueAt: 1 })
      .exec();
  }

  hasRenewalInvoice(
    customerUserId: string,
    currentPeriodEnd: Date,
  ): Promise<boolean> {
    return this.invoiceModel
      .exists({
        customerUserId: new Types.ObjectId(customerUserId),
        status: { $ne: ManualInvoiceStatus.VOID },
        servicePeriodEnd: { $gt: currentPeriodEnd },
      })
      .then(Boolean);
  }

  hasInvoiceForCustomerSince(
    customerUserId: string,
    since: Date,
  ): Promise<boolean> {
    return this.invoiceModel
      .exists({
        customerUserId: new Types.ObjectId(customerUserId),
        status: { $ne: ManualInvoiceStatus.VOID },
        createdAt: { $gte: since },
      })
      .then(Boolean);
  }

  countInvoices(status: ManualInvoiceStatus): Promise<number> {
    return this.invoiceModel
      .countDocuments({ status, archivedAt: null })
      .exec();
  }

  async outstandingByCurrency(): Promise<OutstandingAmount[]> {
    const rows = await this.invoiceModel
      .aggregate<{ _id: string; amountMinor: number }>([
        {
          $match: {
            status: {
              $in: [ManualInvoiceStatus.SENT, ManualInvoiceStatus.OVERDUE],
            },
            archivedAt: null,
            amountMinor: { $type: 'number' },
            currency: { $type: 'string' },
          },
        },
        { $group: { _id: '$currency', amountMinor: { $sum: '$amountMinor' } } },
        { $sort: { _id: 1 } },
      ])
      .exec();

    return rows.map((row) => ({
      currency: row._id,
      amountMinor: row.amountMinor,
    }));
  }
}
