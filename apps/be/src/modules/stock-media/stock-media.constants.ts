/**
 * Media-type filter accepted by the search endpoint. `ALL` defaults to the
 * provider's photo feed (providers have no mixed image/video endpoint).
 */
export enum StockMediaTypeFilter {
  ALL = 'all',
  IMAGE = 'image',
  VIDEO = 'video',
}

/** Concrete media type of a single stock item (used by item/import routes). */
export enum StockMediaItemType {
  IMAGE = 'image',
  VIDEO = 'video',
}

export enum StockOrientation {
  LANDSCAPE = 'landscape',
  PORTRAIT = 'portrait',
  SQUARE = 'square',
}

/**
 * Color filter exposed to the UI (images only). Mapped to provider-specific
 * color tokens in the provider (e.g. Pexels uses `violet` for purple).
 */
export enum StockColor {
  RED = 'red',
  ORANGE = 'orange',
  YELLOW = 'yellow',
  GREEN = 'green',
  BLUE = 'blue',
  PURPLE = 'purple',
  BLACK = 'black',
  WHITE = 'white',
  GRAY = 'gray',
}

export const STOCK_MEDIA_DEFAULT_PER_PAGE = 20;
export const STOCK_MEDIA_MAX_PER_PAGE = 80;
export const STOCK_MEDIA_MAX_PAGE = 1000;
export const STOCK_MEDIA_MAX_QUERY_LENGTH = 100;
