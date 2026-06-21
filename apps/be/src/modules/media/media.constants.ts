export const MEDIA_COLLECTION = 'mediaitems';

export const MEDIA_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const MEDIA_MAX_FILES_PER_UPLOAD = 10;

export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export const ALLOWED_VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/webm',
  'video/quicktime',
] as const;

export const ALLOWED_MEDIA_MIME_TYPES = [
  ...ALLOWED_IMAGE_MIME_TYPES,
  ...ALLOWED_VIDEO_MIME_TYPES,
] as const;

export type AllowedMediaMimeType = (typeof ALLOWED_MEDIA_MIME_TYPES)[number];

export const THUMBNAIL_SMALL_MAX_WIDTH = 320;
export const THUMBNAIL_LARGE_MAX_WIDTH = 1280;

/**
 * Original images are re-encoded to WebP before being stored on R2 to keep us
 * within the free storage tier. WebP is widely supported by browsers and yields
 * far smaller files than JPEG/PNG at comparable quality.
 */
export const ORIGINAL_IMAGE_WEBP_QUALITY = 82;

/**
 * Originals are downscaled to this max width (never enlarged) before encoding.
 * Camera/phone uploads are typically far larger than any realistic display use,
 * so capping here saves significant storage with no perceptible quality loss.
 */
export const ORIGINAL_IMAGE_MAX_WIDTH = 2560;

/** MIME type and extension of stored, compressed original images. */
export const COMPRESSED_IMAGE_MIME_TYPE = 'image/webp';
export const COMPRESSED_IMAGE_EXTENSION = '.webp';

/**
 * Videos are re-encoded to H.264/AAC MP4 to shrink R2 usage. CRF is the
 * quality/size knob (lower = better quality & larger); 28 is a good balance for
 * signage. The result is only kept if it actually came out smaller than the
 * source (see MediaVideoService), so already-efficient uploads are left as-is.
 */
export const VIDEO_TRANSCODE_CRF = 28;

/** Originals are downscaled to at most this height (never enlarged). */
export const VIDEO_TRANSCODE_MAX_HEIGHT = 1080;

/** MIME type and extension of stored, transcoded videos. */
export const TRANSCODED_VIDEO_MIME_TYPE = 'video/mp4';
export const TRANSCODED_VIDEO_EXTENSION = '.mp4';

/** Fixed 16:9 dimensions used for the synthetic video placeholder thumbnail. */
export const VIDEO_PLACEHOLDER_WIDTH = 1280;
export const VIDEO_PLACEHOLDER_HEIGHT = 720;

/**
 * Number of times the async thumbnail-processing step is retried before the
 * item is marked FAILED. Also used by the reconciliation sweep.
 */
export const MEDIA_PROCESSING_MAX_ATTEMPTS = 3;

/**
 * An item left in PROCESSING longer than this is considered stuck (e.g. the
 * process died mid-processing) and is re-driven by the reconciliation sweep.
 * Kept short so transient failures recover within the client's poll window.
 */
export const MEDIA_PROCESSING_STALE_MS = 60 * 1000;
