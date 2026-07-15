import { Injectable, Logger } from '@nestjs/common';
import { Types } from 'mongoose';
import { I18nService } from 'nestjs-i18n';

import {
  buildConfigZod,
  type AiGenerationInput,
  type AiSlide,
  type ConfigSchema,
} from '@edge/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { TransactionService } from '../../common/services/transaction.service';
import {
  AppInstancesRepository,
  CreateInstanceData,
} from '../apps/app-instances.repository';
import { AppsRepository } from '../apps/apps.repository';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import {
  PlaylistItemType,
  PlaylistItemValue,
} from '../playlists/schemas/playlist.schema';
import {
  AI_CONTENT_SLIDE_DURATION_SECONDS,
  TEXT_APP_SLUG,
} from './ai-content.constants';
import { AiContentRepository } from './ai-content.repository';
import { AiGenerationDocument } from './schemas/ai-generation.schema';

/** Thrown to abort (and roll back) a materialization another writer already won. */
class AlreadyMaterializedError extends Error {}

/**
 * Turns a succeeded generation's slides into `text` app instances assembled into
 * a new draft playlist. `text` catalog app is resolved by slug and instances are
 * created directly (bypassing the `isPublic` gate `AppInstancesService.create`
 * enforces, and writing a full config rather than defaults) — this is an
 * internal, system-initiated write. All writes run in one transaction; an atomic
 * `playlistId` claim makes it idempotent (a second confirm returns the same
 * playlist instead of creating a duplicate).
 */
@Injectable()
export class AiContentMaterializer {
  private readonly logger = new Logger(AiContentMaterializer.name);

  constructor(
    private readonly appsRepository: AppsRepository,
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly aiContentRepository: AiContentRepository,
    private readonly transactionService: TransactionService,
    private readonly i18n: I18nService,
  ) {}

  async materialize(
    organizationId: string,
    generation: AiGenerationDocument,
    name?: string,
  ): Promise<{ playlistId: string }> {
    // Idempotent: already materialized → return the existing playlist.
    if (generation.playlistId) {
      return { playlistId: generation.playlistId.toString() };
    }

    const result = generation.result;
    if (!result || result.slides.length === 0) {
      throw BusinessException.badRequest(this.i18n.t('ai-content.notReady'));
    }

    const textApp = await this.appsRepository.findBySlug(TEXT_APP_SLUG);
    if (!textApp) {
      throw BusinessException.badRequest(
        this.i18n.t('ai-content.textAppMissing'),
      );
    }

    const generationId = generation._id.toString();
    const playlistName =
      name?.trim() ||
      result.suggestedName?.trim() ||
      this.i18n.t('ai-content.defaultPlaylistName') ||
      'AI generated playlist';

    // Keep only slides that will actually show something (text and/or a photo).
    const usableSlides = result.slides.filter(
      (slide) =>
        slideToHtml(slide).trim().length > 0 ||
        (typeof slide.imageUrl === 'string' && slide.imageUrl.length > 0),
    );
    if (usableSlides.length === 0) {
      throw BusinessException.badRequest(this.i18n.t('ai-content.notReady'));
    }

    // Build + validate each slide's text-widget config and derive a thematic
    // instance name, up front (fail fast, before opening the transaction).
    const prepared = usableSlides.map((slide, index) => ({
      name: buildInstanceName(slide, index, generation.input),
      config: this.buildTextConfig(textApp.configSchema, slide),
    }));

    try {
      const playlistId = await this.transactionService.run(async (session) => {
        const instanceData: CreateInstanceData[] = prepared.map((entry) => ({
          organizationId,
          appId: textApp._id.toString(),
          appSlug: textApp.slug,
          name: entry.name,
          config: entry.config,
          configVersion: textApp.version,
        }));

        const instances = await this.appInstancesRepository.createMany(
          instanceData,
          session,
        );

        const items: PlaylistItemValue[] = instances.map((instance, index) => ({
          _id: new Types.ObjectId(),
          type: PlaylistItemType.APP,
          appInstanceId: instance._id,
          order: index,
          duration: AI_CONTENT_SLIDE_DURATION_SECONDS,
          disabled: false,
        }));

        const playlist = await this.playlistsRepository.createWithItems(
          { organizationId, name: playlistName },
          {
            items,
            itemCount: items.length,
            totalDuration: items.length * AI_CONTENT_SLIDE_DURATION_SECONDS,
          },
          session,
        );

        const claimed = await this.aiContentRepository.claimForMaterialization(
          generationId,
          organizationId,
          playlist._id,
          session,
        );
        if (!claimed) {
          // Another concurrent confirm already created a playlist for this
          // generation — abort so this transaction's writes roll back.
          throw new AlreadyMaterializedError();
        }

        return playlist._id.toString();
      });

      return { playlistId };
    } catch (error) {
      if (error instanceof AlreadyMaterializedError) {
        const fresh = await this.aiContentRepository.findById(generationId);
        if (fresh?.playlistId) {
          return { playlistId: fresh.playlistId.toString() };
        }
      }
      throw error;
    }
  }

  private buildTextConfig(
    configSchema: ConfigSchema,
    slide: AiSlide,
  ): Record<string, unknown> {
    const hasImage =
      typeof slide.imageUrl === 'string' && slide.imageUrl.length > 0;
    const config: Record<string, unknown> = {
      body: slideToHtml(slide),
      color: '#FFFFFF',
      backgroundColor: '#000000',
      // Photo-forward slides use a lighter scrim so the image reads; message
      // slides use a darker scrim so the copy stays legible.
      overlay: slide.layout === 'photo' ? 'light' : 'dark',
      ...(hasImage ? { backgroundImage: slide.imageUrl } : {}),
    };

    // Validate against the text app's own config schema, the same way the
    // instance-config write path does — so a malformed slide can't produce an
    // invalid instance.
    const validation = buildConfigZod(configSchema, config).safeParse(config);
    if (!validation.success) {
      this.logger.warn(
        `Generated slide failed text-app config validation: ${validation.error.message}`,
      );
      throw BusinessException.badRequest(
        this.i18n.t('ai-content.invalidOutput'),
      );
    }

    return validation.data;
  }
}

/**
 * A thematic instance name derived from the slide's own copy (its title, else
 * the first of the body), falling back to the business/industry — so instances
 * read like "Summer sale is on" instead of "Text 1".
 */
function buildInstanceName(
  slide: AiSlide,
  index: number,
  input: AiGenerationInput,
): string {
  const title = slide.title?.trim() ?? '';
  const body = slide.body?.trim() ?? '';
  const source = title.length > 0 ? title : body;
  const cleaned = source.replace(/\s+/g, ' ').trim();
  if (cleaned.length > 0) {
    return truncate(cleaned, 80);
  }
  const business = input.businessName?.trim() ?? '';
  const label = business.length > 0 ? business : input.industry;
  return `${label} ${index + 1}`;
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

/** Render a slide into the `text` widget's sanitized-HTML `body` (may be empty). */
function slideToHtml(slide: AiSlide): string {
  const parts: string[] = [];
  if (slide.title?.trim()) {
    parts.push(`<p><strong>${escapeHtml(slide.title)}</strong></p>`);
  }
  if (slide.body?.trim()) {
    parts.push(`<p>${escapeHtml(slide.body).replace(/\n/g, '<br>')}</p>`);
  }
  return parts.join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
