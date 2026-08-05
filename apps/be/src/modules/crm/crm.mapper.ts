import { CrmLeadDocument } from './schemas/crm-lead.schema';

export const toCrmLeadDto = (lead: CrmLeadDocument) => ({
  id: lead._id.toString(),
  type: lead.type,
  status: lead.status,
  name: lead.name,
  email: lead.email,
  ...(lead.phone ? { phone: lead.phone } : {}),
  ...(lead.company ? { company: lead.company } : {}),
  message: lead.message,
  ...(lead.screenQuantity !== undefined
    ? { screenQuantity: lead.screenQuantity }
    : {}),
  ...(lead.city ? { city: lead.city } : {}),
  ...(lead.country ? { country: lead.country } : {}),
  ...(lead.locale ? { locale: lead.locale } : {}),
  ...(lead.anonymousId ? { anonymousId: lead.anonymousId } : {}),
  ...(lead.firstTouch ? { firstTouch: lead.firstTouch } : {}),
  ...(lead.lastTouch ? { lastTouch: lead.lastTouch } : {}),
  emailNotificationStatus: lead.emailNotificationStatus,
  emailNotificationAt: lead.emailNotificationAt?.toISOString() ?? null,
  statusHistory: lead.statusHistory.map((entry) => ({
    status: entry.status,
    actorUserId: entry.actorUserId?.toString() ?? null,
    occurredAt: entry.occurredAt.toISOString(),
  })),
  internalNotes: lead.internalNotes.map((note) => ({
    actorUserId: note.actorUserId.toString(),
    text: note.text,
    createdAt: note.createdAt.toISOString(),
  })),
  createdAt: lead.createdAt.toISOString(),
  updatedAt: lead.updatedAt.toISOString(),
});

export type CrmLeadDto = ReturnType<typeof toCrmLeadDto>;
