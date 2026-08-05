import { Injectable, Logger } from '@nestjs/common';

import { toPaginatedResult } from '../../common/dto/paginated-result';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AnalyticsService } from '../analytics/analytics.service';
import { FunnelEventName } from '../analytics/schemas/funnel-event.schema';
import { MailService } from '../mail/mail.service';
import { CrmRepository } from './crm.repository';
import { CreateCrmLeadDto } from './dto/create-crm-lead.dto';
import { ListCrmLeadsQueryDto } from './dto/list-crm-leads-query.dto';
import { UpdateCrmLeadDto } from './dto/update-crm-lead.dto';
import { CrmLeadDto, toCrmLeadDto } from './crm.mapper';
import {
  CrmLeadDocument,
  CrmLeadEmailStatus,
  CrmLeadStatus,
} from './schemas/crm-lead.schema';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(
    private readonly repository: CrmRepository,
    private readonly analytics: AnalyticsService,
    private readonly mail: MailService,
  ) {}

  async createLead(dto: CreateCrmLeadDto): Promise<void> {
    const existing = await this.repository.findBySubmissionId(dto.submissionId);
    if (existing) return;

    const acquisition = this.analytics.parseAcquisitionToken(
      dto.acquisitionToken,
    );
    let lead: CrmLeadDocument;
    try {
      lead = await this.repository.create({
        submissionId: dto.submissionId,
        type: dto.type,
        status: CrmLeadStatus.NEW,
        name: dto.name.trim(),
        email: dto.email,
        ...(dto.phone?.trim() ? { phone: dto.phone.trim() } : {}),
        ...(dto.company?.trim() ? { company: dto.company.trim() } : {}),
        message: dto.message.trim(),
        ...(dto.screenQuantity !== undefined
          ? { screenQuantity: dto.screenQuantity }
          : {}),
        ...(dto.city?.trim() ? { city: dto.city.trim() } : {}),
        ...(dto.country?.trim()
          ? { country: dto.country.trim().toUpperCase() }
          : {}),
        ...(dto.locale?.trim() ? { locale: dto.locale.trim() } : {}),
        ...((dto.anonymousId ?? acquisition?.anonymousId)
          ? { anonymousId: dto.anonymousId ?? acquisition?.anonymousId }
          : {}),
        ...(acquisition?.firstTouch
          ? { firstTouch: acquisition.firstTouch }
          : {}),
        ...(acquisition?.lastTouch ? { lastTouch: acquisition.lastTouch } : {}),
        emailNotificationStatus: CrmLeadEmailStatus.PENDING,
        emailNotificationAt: null,
        statusHistory: [
          {
            status: CrmLeadStatus.NEW,
            actorUserId: null,
            occurredAt: new Date(),
          },
        ],
        internalNotes: [],
        archivedAt: null,
      });
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return;
      throw error;
    }

    await this.analytics.record({
      eventName: FunnelEventName.GENERATE_LEAD,
      anonymousId: dto.anonymousId,
      acquisitionToken: dto.acquisitionToken,
      leadType: dto.type,
      dedupeKey: `generate_lead:crm:${lead._id.toString()}`,
      properties: {
        form: dto.type,
        ...(dto.locale ? { locale: dto.locale } : {}),
        ...(dto.screenQuantity !== undefined
          ? { screenQuantity: dto.screenQuantity }
          : {}),
      },
    });

    void this.notifyFounder(lead);
  }

  async list(query: ListCrmLeadsQueryDto) {
    const { items, total } = await this.repository.list(query);
    return toPaginatedResult(
      items.map(toCrmLeadDto),
      total,
      query.page,
      query.limit,
    );
  }

  async getById(id: string): Promise<CrmLeadDto> {
    return toCrmLeadDto(await this.getDocument(id));
  }

  async update(
    id: string,
    actorUserId: string,
    dto: UpdateCrmLeadDto,
  ): Promise<CrmLeadDto> {
    if (dto.status === undefined && dto.note === undefined) {
      return this.getById(id);
    }
    const updated = await this.repository.update(id, actorUserId, dto);
    if (!updated) throw BusinessException.notFound('CRM lead not found');
    return toCrmLeadDto(updated);
  }

  async overview() {
    const statuses = Object.values(CrmLeadStatus);
    const result = await this.repository.statusCounts();
    const counts = new Map(result.map((item) => [item._id, item.count]));
    return {
      total: result.reduce((sum, item) => sum + item.count, 0),
      byStatus: Object.fromEntries(
        statuses.map((status) => [status, counts.get(status) ?? 0]),
      ),
    };
  }

  private async getDocument(id: string): Promise<CrmLeadDocument> {
    const lead = await this.repository.findById(id);
    if (!lead) throw BusinessException.notFound('CRM lead not found');
    return lead;
  }

  private async notifyFounder(lead: CrmLeadDocument): Promise<void> {
    try {
      const sent = await this.mail.sendCrmLeadEmail(toCrmLeadDto(lead));
      await this.repository.updateEmailStatus(
        lead._id.toString(),
        sent ? CrmLeadEmailStatus.SENT : CrmLeadEmailStatus.SKIPPED,
      );
    } catch (error) {
      await this.repository.updateEmailStatus(
        lead._id.toString(),
        CrmLeadEmailStatus.FAILED,
      );
      this.logger.error(
        `CRM lead notification failed for lead ${lead._id.toString()}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
