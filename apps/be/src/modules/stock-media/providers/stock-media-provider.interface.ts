import { StockMediaItemType } from '../stock-media.constants';
import {
  StockMediaAsset,
  StockMediaCuratedParams,
  StockMediaItemDto,
  StockMediaPageDto,
  StockMediaSearchParams,
} from './stock-media-provider.types';

/** DI token for the active stock-media provider. */
export const STOCK_MEDIA_PROVIDER = Symbol('STOCK_MEDIA_PROVIDER');

/**
 * Contract every stock provider implements. Adding Unsplash/Pixabay/etc. is a
 * matter of writing a new class and binding it to {@link STOCK_MEDIA_PROVIDER}
 * — no controller, service, or frontend changes required.
 */
export interface StockMediaProvider {
  /** Provider identifier stored on imported items (e.g. `pexels`). */
  readonly name: string;

  /** Whether the provider is usable (e.g. API key present). */
  isConfigured(): boolean;

  search(params: StockMediaSearchParams): Promise<StockMediaPageDto>;
  curated(params: StockMediaCuratedParams): Promise<StockMediaPageDto>;
  getItem(
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaItemDto>;

  /** Downloads the original asset (plus a poster for videos) for import. */
  fetchAsset(
    id: string,
    mediaType: StockMediaItemType,
  ): Promise<StockMediaAsset>;
}
