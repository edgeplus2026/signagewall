import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { I18nService } from 'nestjs-i18n';

import {
  PaginatedResult,
  toPaginatedResult,
} from '../../common/dto/paginated-result';
import { BusinessException } from '../../common/exceptions/business.exception';
import type { RequestUser } from '../../common/interfaces/request-user.interface';
import { UsersRepository } from '../users/users.repository';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { PublishNotificationDto } from './dto/publish-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import {
  AdminNotificationDto,
  toAdminNotificationDto,
  toUserNotificationDto,
  UserNotificationDto,
} from './mappers/notification.mapper';
import {
  NotificationChangedEvent,
  NotificationEvents,
} from './notifications.events';
import {
  CreateSystemNotificationData,
  NotificationsRepository,
} from './notifications.repository';
import { NotificationStatus } from './schemas/notification.schema';

@Injectable()
export class NotificationsService {
  constructor(
    private readonly notificationsRepository: NotificationsRepository,
    private readonly usersRepository: UsersRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly i18n: I18nService,
  ) {}

  // --- Admin (authoring) -----------------------------------------------------

  async listAdmin(
    page: number,
    limit: number,
    status?: NotificationStatus,
  ): Promise<PaginatedResult<AdminNotificationDto>> {
    const { items, total } = await this.notificationsRepository.listAdmin({
      page,
      limit,
      status,
    });
    return toPaginatedResult(
      items.map(toAdminNotificationDto),
      total,
      page,
      limit,
    );
  }

  async getAdmin(id: string): Promise<AdminNotificationDto> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }
    return toAdminNotificationDto(notification);
  }

  async create(
    userId: string,
    dto: CreateNotificationDto,
  ): Promise<AdminNotificationDto> {
    const created = await this.notificationsRepository.create({
      translations: dto.translations,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      createdBy: userId,
    });
    return toAdminNotificationDto(created);
  }

  async update(
    id: string,
    dto: UpdateNotificationDto,
  ): Promise<AdminNotificationDto> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }
    if (notification.status === 'published') {
      throw BusinessException.badRequest(
        this.i18n.t('notifications.cannotEditPublished'),
      );
    }

    const updated = await this.notificationsRepository.update(id, {
      translations: dto.translations,
      expiresAt:
        dto.expiresAt === undefined ? undefined : new Date(dto.expiresAt),
    });
    return toAdminNotificationDto(updated ?? notification);
  }

  async publish(
    id: string,
    dto: PublishNotificationDto,
  ): Promise<AdminNotificationDto> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }

    // Re-publishing a still-published notification (e.g. to change its expiry)
    // keeps the original publish moment; publishing a draft — including one that
    // was unpublished (which clears `publishedAt`) — stamps a fresh time so it
    // re-announces.
    const publishedAt = notification.publishedAt ?? new Date();
    const expiresAt =
      dto.expiresAt !== undefined
        ? new Date(dto.expiresAt)
        : notification.expiresAt;

    const updated = await this.notificationsRepository.publish(id, {
      publishedAt,
      expiresAt,
    });
    this.emitChanged(id);
    return toAdminNotificationDto(updated ?? notification);
  }

  async unpublish(id: string): Promise<AdminNotificationDto> {
    const notification = await this.notificationsRepository.findById(id);
    if (!notification) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }
    const updated = await this.notificationsRepository.unpublish(id);
    this.emitChanged(id);
    return toAdminNotificationDto(updated ?? notification);
  }

  async remove(id: string): Promise<void> {
    const deleted = await this.notificationsRepository.delete(id);
    if (!deleted) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }
    await this.notificationsRepository.deleteReceiptsByNotificationId(id);
    this.emitChanged(id);
  }

  // --- System (generated) ----------------------------------------------------

  /**
   * Creates an already-published notification targeted at specific users on
   * behalf of the system (no authoring super-admin), e.g. device-offline /
   * recovery alerts. Returns the new id, or null when there are no recipients.
   * Emits {@link NotificationEvents.Changed} so the bell live-refreshes.
   */
  async createSystemNotification(
    data: Omit<CreateSystemNotificationData, 'publishedAt'> & {
      publishedAt?: Date;
    },
  ): Promise<string | null> {
    const recipientUserIds = [...new Set(data.recipientUserIds)];
    if (recipientUserIds.length === 0) {
      return null;
    }

    const created = await this.notificationsRepository.createSystem({
      ...data,
      recipientUserIds,
      publishedAt: data.publishedAt ?? new Date(),
    });

    const id = created._id.toString();
    this.emitChanged(id);
    return id;
  }

  // --- User (inbox) ----------------------------------------------------------

  async listForUser(
    user: RequestUser,
    lang: string,
    page: number,
    limit: number,
  ): Promise<PaginatedResult<UserNotificationDto>> {
    const userCreatedAt = await this.resolveUserCreatedAt(user.id);
    const { items, total } = await this.notificationsRepository.listVisible({
      userId: user.id,
      userCreatedAt,
      page,
      limit,
    });
    return toPaginatedResult(
      items.map((row) => toUserNotificationDto(row, lang)),
      total,
      page,
      limit,
    );
  }

  async unreadCount(user: RequestUser): Promise<{ count: number }> {
    const userCreatedAt = await this.resolveUserCreatedAt(user.id);
    const count = await this.notificationsRepository.countUnread({
      userId: user.id,
      userCreatedAt,
    });
    return { count };
  }

  async markRead(user: RequestUser, id: string): Promise<void> {
    const userCreatedAt = await this.resolveUserCreatedAt(user.id);
    const notification = await this.notificationsRepository.findVisibleById(
      id,
      userCreatedAt,
      user.id,
    );
    if (!notification) {
      throw BusinessException.notFound(this.i18n.t('notifications.notFound'));
    }
    await this.notificationsRepository.markRead(user.id, id);
  }

  async markAllRead(user: RequestUser): Promise<void> {
    const userCreatedAt = await this.resolveUserCreatedAt(user.id);
    await this.notificationsRepository.markAllRead(user.id, userCreatedAt);
  }

  // --- Helpers ---------------------------------------------------------------

  private async resolveUserCreatedAt(userId: string): Promise<Date> {
    const user = await this.usersRepository.findById(userId);
    return user?.createdAt ?? new Date(0);
  }

  private emitChanged(notificationId: string): void {
    this.eventEmitter.emit(NotificationEvents.Changed, {
      notificationId,
    } satisfies NotificationChangedEvent);
  }
}
