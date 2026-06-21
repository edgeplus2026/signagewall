import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  ALLOWED_IMAGE_MIME_TYPES,
  ALLOWED_VIDEO_MIME_TYPES,
} from '../../media/media.constants';
import {
  StockColor,
  StockMediaItemType,
  StockMediaTypeFilter,
} from '../stock-media.constants';
import { StockMediaProvider } from './stock-media-provider.interface';
import {
  StockMediaAsset,
  StockMediaCuratedParams,
  StockMediaItemDto,
  StockMediaPageDto,
  StockMediaSearchParams,
} from './stock-media-provider.types';

// --- Minimal typings for the slices of the Pexels API we consume ---------

interface PexelsPhoto {
  id: number;
  width: number;
  height: number;
  url: string;
  alt?: string;
  photographer: string;
  photographer_url?: string;
  src: {
    original: string;
    large2x?: string;
    large?: string;
    medium?: string;
    small?: string;
    tiny?: string;
  };
}

interface PexelsVideoFile {
  id: number;
  quality?: string;
  file_type?: string;
  width?: number;
  height?: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  url: string;
  image: string;
  duration: number;
  user: { name: string; url?: string };
  video_files: PexelsVideoFile[];
}

interface PexelsPhotosResponse {
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
  total_results: number;
  next_page?: string;
}

interface PexelsVideosResponse {
  videos: PexelsVideo[];
  page: number;
  per_page: number;
  total_results: number;
  next_page?: string;
}

/** Our color tokens → Pexels color tokens (Pexels uses `violet` for purple). */
const PEXELS_COLOR_MAP: Record<StockColor, string> = {
  [StockColor.RED]: 'red',
  [StockColor.ORANGE]: 'orange',
  [StockColor.YELLOW]: 'yellow',
  [StockColor.GREEN]: 'green',
  [StockColor.BLUE]: 'blue',
  [StockColor.PURPLE]: 'violet',
  [StockColor.BLACK]: 'black',
  [StockColor.WHITE]: 'white',
  [StockColor.GRAY]: 'gray',
};

/** Cap imported video renditions to bound file size / signage suitability. */
const MAX_IMPORT_VIDEO_WIDTH = 1920;

/** Timeouts for outbound calls so a hung upstream can't stall the request. */
const API_REQUEST_TIMEOUT_MS = 15_000;
const ASSET_DOWNLOAD_TIMEOUT_MS = 30_000;

/**
 * Hard ceiling on a downloaded asset, independent of the per-import limit
 * enforced downstream — prevents buffering a pathologically large response.
 */
const MAX_DOWNLOAD_BYTES = 200 * 1024 * 1024;

@Injectable()
export class PexelsProvider implements StockMediaProvider {
  readonly name = 'pexels';

  private readonly logger = new Logger(PexelsProvider.name);
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('pexels.apiKey')?.trim() ?? '';
    this.baseUrl =
      this.configService.get<string>('pexels.baseUrl')?.trim() ??
      'https://api.pexels.com';
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  async search(params: StockMediaSearchParams): Promise<StockMediaPageDto> {
    if (params.mediaType === StockMediaTypeFilter.VIDEO) {
      return this.searchVideos(params);
    }
    return this.searchPhotos(params);
  }

  async curated(params: StockMediaCuratedParams): Promise<StockMediaPageDto> {
    // Pexels' curated feed is photos-only; surface popular videos when the
    // caller is browsing the video feed with no search query.
    if (params.mediaType === StockMediaTypeFilter.VIDEO) {
      const response = await this.request<PexelsVideosResponse>(
        '/videos/popular',
        {
          page: params.page,
          per_page: params.perPage,
        },
      );

      return this.toVideoPage(response);
    }

    const response = await this.request<PexelsPhotosResponse>('/v1/curated', {
      page: params.page,
      per_page: params.perPage,
    });

    return this.toPhotoPage(response);
  }

  async getItem(
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaItemDto> {
    const encodedId = encodeURIComponent(id);

    if (mediaType === StockMediaItemType.VIDEO) {
      const video = await this.request<PexelsVideo>(
        `/videos/videos/${encodedId}`,
      );
      return this.mapVideo(video);
    }

    const photo = await this.request<PexelsPhoto>(`/v1/photos/${encodedId}`);
    return this.mapPhoto(photo);
  }

  async fetchAsset(
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaAsset> {
    if (mediaType === StockMediaItemType.VIDEO) {
      return this.fetchVideoAsset(id);
    }
    return this.fetchPhotoAsset(id);
  }

  // --- Search -------------------------------------------------------------

  private async searchPhotos(
    params: StockMediaSearchParams,
  ): Promise<StockMediaPageDto> {
    const response = await this.request<PexelsPhotosResponse>('/v1/search', {
      query: params.query,
      page: params.page,
      per_page: params.perPage,
      orientation: params.orientation,
      color: params.color ? PEXELS_COLOR_MAP[params.color] : undefined,
    });

    return this.toPhotoPage(response);
  }

  private async searchVideos(
    params: StockMediaSearchParams,
  ): Promise<StockMediaPageDto> {
    const response = await this.request<PexelsVideosResponse>(
      '/videos/search',
      {
        query: params.query,
        page: params.page,
        per_page: params.perPage,
        orientation: params.orientation,
      },
    );

    return this.toVideoPage(response);
  }

  // --- Asset download -----------------------------------------------------

  private async fetchPhotoAsset(id: string): Promise<StockMediaAsset> {
    const photo = await this.request<PexelsPhoto>(
      `/v1/photos/${encodeURIComponent(id)}`,
    );
    const { buffer, contentType } = await this.fetchBinary(photo.src.original);
    const mimeType = this.resolveImageMime(contentType);

    return {
      buffer,
      mimeType,
      name: this.buildAssetName(
        photo.alt,
        `pexels-photo-${photo.id}`,
        mimeType,
      ),
    };
  }

  private async fetchVideoAsset(id: string): Promise<StockMediaAsset> {
    const video = await this.request<PexelsVideo>(
      `/videos/videos/${encodeURIComponent(id)}`,
    );
    const file = this.pickVideoFile(video.video_files, true);

    if (!file) {
      throw new Error(`Pexels video ${id} has no downloadable file`);
    }

    const { buffer, contentType } = await this.fetchBinary(file.link);
    const mimeType = this.resolveVideoMime(file.file_type, contentType);

    // The poster frame is a best-effort thumbnail source; never fail the import
    // over it (the placeholder path covers a missing/invalid poster).
    let thumbnailSource: StockMediaAsset['thumbnailSource'];
    try {
      if (video.image) {
        const poster = await this.fetchBinary(video.image);
        thumbnailSource = {
          buffer: poster.buffer,
          mimeType: this.resolveImageMime(poster.contentType),
        };
      }
    } catch (error) {
      this.logger.warn(
        `Failed to fetch Pexels poster for video ${id}; using placeholder`,
        error as Error,
      );
    }

    const durationSeconds =
      video.duration >= 1 && video.duration <= 3600
        ? video.duration
        : undefined;

    return {
      buffer,
      mimeType,
      name: `pexels-video-${video.id}.mp4`,
      ...(durationSeconds !== undefined ? { durationSeconds } : {}),
      ...(thumbnailSource ? { thumbnailSource } : {}),
    };
  }

  // --- Mapping ------------------------------------------------------------

  private toPhotoPage(response: PexelsPhotosResponse): StockMediaPageDto {
    return {
      items: response.photos.map((photo) => this.mapPhoto(photo)),
      page: response.page,
      perPage: response.per_page,
      totalResults: response.total_results,
      hasMore: Boolean(response.next_page),
    };
  }

  private toVideoPage(response: PexelsVideosResponse): StockMediaPageDto {
    return {
      items: response.videos.map((video) => this.mapVideo(video)),
      page: response.page,
      perPage: response.per_page,
      totalResults: response.total_results,
      hasMore: Boolean(response.next_page),
    };
  }

  private mapPhoto(photo: PexelsPhoto): StockMediaItemDto {
    return {
      id: String(photo.id),
      provider: this.name,
      mediaType: StockMediaItemType.IMAGE,
      width: photo.width,
      height: photo.height,
      thumbnailUrl: photo.src.medium ?? photo.src.small ?? photo.src.original,
      previewUrl: photo.src.large2x ?? photo.src.large ?? photo.src.original,
      author: photo.photographer,
      ...(photo.photographer_url ? { authorUrl: photo.photographer_url } : {}),
      sourceUrl: photo.url,
      ...(photo.alt ? { alt: photo.alt } : {}),
    };
  }

  private mapVideo(video: PexelsVideo): StockMediaItemDto {
    const previewFile = this.pickVideoFile(video.video_files, false);

    return {
      id: String(video.id),
      provider: this.name,
      mediaType: StockMediaItemType.VIDEO,
      width: video.width,
      height: video.height,
      thumbnailUrl: video.image,
      previewUrl: video.image,
      ...(previewFile ? { videoUrl: previewFile.link } : {}),
      duration: video.duration,
      author: video.user.name,
      ...(video.user.url ? { authorUrl: video.user.url } : {}),
      sourceUrl: video.url,
    };
  }

  /**
   * Picks an mp4 rendition. `preferBest` selects the largest within a sane
   * resolution cap (for import); otherwise the smallest decent rendition (for
   * fast in-modal preview playback).
   */
  private pickVideoFile(
    files: PexelsVideoFile[],
    preferBest: boolean,
  ): PexelsVideoFile | undefined {
    const mp4 = files.filter((f) => f.file_type === 'video/mp4' && f.link);
    const candidates = mp4.length > 0 ? mp4 : files.filter((f) => f.link);

    if (candidates.length === 0) {
      return undefined;
    }

    const sorted = [...candidates].sort(
      (a, b) => (a.width ?? 0) - (b.width ?? 0),
    );

    if (preferBest) {
      const capped = sorted.filter(
        (f) => (f.width ?? 0) <= MAX_IMPORT_VIDEO_WIDTH,
      );
      return capped.length > 0 ? capped[capped.length - 1] : sorted[0];
    }

    return sorted[0];
  }

  // --- HTTP ---------------------------------------------------------------

  private async request<T>(
    path: string,
    searchParams?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(path, this.baseUrl);

    if (searchParams) {
      for (const [key, value] of Object.entries(searchParams)) {
        if (value !== undefined && value !== '') {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const response = await fetch(url, {
      headers: { Authorization: this.apiKey },
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Pexels request to ${path} failed with status ${String(response.status)}`,
      );
    }

    return (await response.json()) as T;
  }

  private async fetchBinary(
    assetUrl: string,
  ): Promise<{ buffer: Buffer; contentType?: string }> {
    // Asset URLs are public CDN links — no Authorization header needed.
    const response = await fetch(assetUrl, {
      signal: AbortSignal.timeout(ASSET_DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(
        `Pexels asset download failed with status ${String(response.status)}`,
      );
    }

    // Reject oversized payloads up front via the advertised length, then
    // re-check the actual bytes in case the header lied.
    const advertised = Number(response.headers.get('content-length'));
    if (Number.isFinite(advertised) && advertised > MAX_DOWNLOAD_BYTES) {
      throw new Error('Pexels asset exceeds the maximum download size');
    }

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
      throw new Error('Pexels asset exceeds the maximum download size');
    }

    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: response.headers.get('content-type') ?? undefined,
    };
  }

  // --- MIME resolution ----------------------------------------------------

  private resolveImageMime(contentType?: string): string {
    const normalized = contentType?.split(';')[0]?.trim().toLowerCase();

    if (
      normalized &&
      ALLOWED_IMAGE_MIME_TYPES.includes(
        normalized as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      return normalized;
    }

    return 'image/jpeg';
  }

  private resolveVideoMime(fileType?: string, contentType?: string): string {
    const candidates = [fileType, contentType?.split(';')[0]];

    for (const candidate of candidates) {
      const normalized = candidate?.trim().toLowerCase();
      if (
        normalized &&
        ALLOWED_VIDEO_MIME_TYPES.includes(
          normalized as (typeof ALLOWED_VIDEO_MIME_TYPES)[number],
        )
      ) {
        return normalized;
      }
    }

    return 'video/mp4';
  }

  private buildAssetName(
    alt: string | undefined,
    fallback: string,
    mimeType: string,
  ): string {
    const base = (alt?.trim() || fallback).slice(0, 80);
    const ext = this.extensionForMime(mimeType);
    return `${base}${ext}`;
  }

  private extensionForMime(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/gif':
        return '.gif';
      case 'video/mp4':
        return '.mp4';
      case 'video/webm':
        return '.webm';
      case 'video/quicktime':
        return '.mov';
      default:
        return '.jpg';
    }
  }
}
