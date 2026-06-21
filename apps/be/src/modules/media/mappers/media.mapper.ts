import { ConfigService } from '@nestjs/config';

import {
  MediaItemDocument,
  MediaItemSource,
  MediaItemStatus,
  MediaItemType,
} from '../schemas/media-item.schema';

export interface MediaItemResponseDto {
  id: string;
  name: string;
  type: MediaItemType;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  size?: number;
  mimeType?: string;
  thumbnailUrl?: string;
  thumbnailLargeUrl?: string;
  fileUrl?: string;
  width?: number;
  height?: number;
  defaultDuration?: number;
  source: MediaItemSource;
  status: MediaItemStatus;
}

/**
 * Media file/thumbnail URLs intentionally resolve to the public R2 bucket
 * (`R2_PUBLIC_URL`). This is a deliberate decision: digital-signage players
 * render assets without an authenticated session, so the bytes must be
 * publicly reachable. Object keys are UUID-prefixed to make them
 * unguessable. If tenant-private media is ever required, switch this to
 * presigned, time-limited URLs and make the bucket private — at which point
 * every consumer (dashboard and players) must request signed URLs.
 */
const toPublicUrl = (
  publicBaseUrl: string | undefined,
  key: string | undefined,
): string | undefined => {
  if (!publicBaseUrl || !key) {
    return undefined;
  }

  return `${publicBaseUrl}/${key}`;
};

export const toMediaItemResponse = (
  item: MediaItemDocument,
  publicBaseUrl?: string,
): MediaItemResponseDto => ({
  id: item._id.toString(),
  name: item.name,
  type: item.type,
  parentId: item.parentId?.toString() ?? null,
  createdAt: item.createdAt.toISOString(),
  updatedAt: item.updatedAt.toISOString(),
  ...(item.size !== undefined ? { size: item.size } : {}),
  ...(item.mimeType ? { mimeType: item.mimeType } : {}),
  ...(toPublicUrl(publicBaseUrl, item.thumbnailSmallKey)
    ? { thumbnailUrl: toPublicUrl(publicBaseUrl, item.thumbnailSmallKey) }
    : {}),
  ...(toPublicUrl(publicBaseUrl, item.thumbnailLargeKey)
    ? { thumbnailLargeUrl: toPublicUrl(publicBaseUrl, item.thumbnailLargeKey) }
    : {}),
  ...(toPublicUrl(publicBaseUrl, item.storageKey)
    ? { fileUrl: toPublicUrl(publicBaseUrl, item.storageKey) }
    : {}),
  ...(item.width !== undefined ? { width: item.width } : {}),
  ...(item.height !== undefined ? { height: item.height } : {}),
  ...(item.defaultDuration !== undefined
    ? { defaultDuration: item.defaultDuration }
    : {}),
  source: item.source,
  status: item.status,
});

export const getMediaThumbnailUrl = (
  item: MediaItemDocument,
  publicBaseUrl?: string,
): string | undefined => {
  const mapped = toMediaItemResponse(item, publicBaseUrl);
  return mapped.thumbnailUrl ?? mapped.fileUrl;
};

export const getPublicBaseUrl = (
  configService: ConfigService,
): string | undefined => configService.get<string>('r2.publicUrl');
