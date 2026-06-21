import {
  StockColor,
  StockMediaItemType,
  StockMediaTypeFilter,
  StockOrientation,
} from '../stock-media.constants';

/**
 * Normalized, provider-agnostic shapes. Controllers and the frontend only ever
 * see these — never raw Pexels (or future Unsplash/Pixabay) payloads — so a
 * provider can be swapped without touching anything downstream.
 */
export interface StockMediaItemDto {
  /** Provider-native id (string for portability across providers). */
  id: string;
  provider: string;
  mediaType: StockMediaItemType;
  width: number;
  height: number;
  /** Small image used in the results grid. */
  thumbnailUrl: string;
  /** Large image (photo) or poster frame (video) for the preview modal. */
  previewUrl: string;
  /** Playable video URL (videos only). */
  videoUrl?: string;
  /** Duration in seconds (videos only). */
  duration?: number;
  author: string;
  authorUrl?: string;
  /** Link to the asset on the provider's site (for attribution). */
  sourceUrl: string;
  alt?: string;
}

export interface StockMediaPageDto {
  items: StockMediaItemDto[];
  page: number;
  perPage: number;
  totalResults: number;
  hasMore: boolean;
}

export interface StockMediaSearchParams {
  query: string;
  page: number;
  perPage: number;
  mediaType: StockMediaTypeFilter;
  orientation?: StockOrientation;
  color?: StockColor;
}

export interface StockMediaCuratedParams {
  page: number;
  perPage: number;
  /** `video` returns a popular-videos feed; otherwise curated photos. */
  mediaType: StockMediaTypeFilter;
}

/** A downloaded asset ready to be persisted via MediaService. */
export interface StockMediaAsset {
  buffer: Buffer;
  mimeType: string;
  name: string;
  durationSeconds?: number;
  /** Optional poster/preview image used as the video thumbnail source. */
  thumbnailSource?: { buffer: Buffer; mimeType: string };
}
