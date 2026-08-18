export const MEDIA_COLLECTION = 'mediaitems';

/**
 * Ceiling for one uploaded file.
 *
 * This was 10 MB for as long as an upload was buffered whole in the heap: the
 * container has already been OOM-killed once over video, and every concurrent
 * upload multiplied the exposure. Uploads are now staged on disk instead
 * (multer writes a temp file, R2 streams it back off disk), so the number is
 * bounded by what a signage clip legitimately needs rather than by heap.
 *
 * 200 MB covers roughly two minutes of 1080p at 15 Mbps — the shape of an
 * agency export. What actually lands in R2 is far smaller, because the video is
 * re-encoded to H.264 CRF 28 afterwards; the cap governs the *source* a
 * customer hands us, not the stored object.
 *
 * Raising it further means auditing two things first: the temp disk this
 * container has (`MEDIA_MAX_CONCURRENT_UPLOADS` files of this size can exist at
 * once) and how long a player on a shop's connection takes to fetch the result.
 */
export const MEDIA_MAX_FILE_SIZE_BYTES = 200 * 1024 * 1024;
export const MEDIA_MAX_FILES_PER_UPLOAD = 10;

/**
 * Bytes read off the front of an upload to check its magic number.
 *
 * The longest signature this checks sits at offset 8 (QuickTime brand), so 64
 * is generous. It exists as a constant to make the point that validating a
 * file's type never requires reading the file.
 */
export const MEDIA_SIGNATURE_HEAD_BYTES = 64;

/**
 * Ceiling for the optional poster frame a client captures for a video.
 *
 * Deliberately NOT the upload ceiling. A poster is one decoded video frame and
 * is read into memory to be thumbnailed, so letting it inherit the 200 MB cap
 * would reintroduce, through a side field, exactly the heap exposure that
 * staging uploads on disk removes.
 */
export const MEDIA_POSTER_MAX_BYTES = 8 * 1024 * 1024;

/** Where multer stages an in-flight upload before it is streamed to R2. */
export const MEDIA_UPLOAD_TEMP_DIR_NAME = 'signagewall-uploads';

/**
 * A staged upload older than this was orphaned — the request died between
 * multer writing the file and the handler deleting it (a cancelled upload, a
 * rejected size limit, a crash). Swept, or a 200 MB cap fills the disk.
 */
export const MEDIA_UPLOAD_TEMP_STALE_MS = 60 * 60 * 1000;

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

/**
 * x264 speed preset and thread cap. Both exist to bound MEMORY, not time.
 *
 * Measured on a 48s 1080p clip, peak RSS of the ffmpeg process alone:
 *
 *   preset=medium,   threads=auto (was)   667 MB   16.8s
 *   preset=medium,   threads=2            473 MB   43.8s
 *   preset=faster,   threads=2            357 MB   21.3s
 *   preset=veryfast, threads=2            295 MB   12.2s
 *
 * The old settings got the container's ffmpeg OOM-killed on Railway — SIGKILL,
 * mid-encode, on an ordinary stock import. Every thread keeps its own frame
 * buffers, so an uncapped encoder scales its footprint with the host's core
 * count: it survived a laptop and died on a small container.
 *
 * `veryfast` is both the lightest AND the fastest here, because the per-frame
 * work it skips outweighs the two threads it gives up. What it costs is
 * compression efficiency at a fixed CRF — invisible on signage content, and a
 * clip that encodes is worth more than one that is marginally smaller.
 */
export const VIDEO_TRANSCODE_PRESET = 'veryfast';
export const VIDEO_TRANSCODE_THREADS = 2;

/**
 * The envelope a signage player can actually decode in HARDWARE.
 *
 * Not a storage-size preference — a hard capability limit. Measured on an Android
 * TV in the field: every one of its nineteen hardware video decoders caps at
 * 1920x1088, and anything past that silently falls back to a software decoder
 * whose H.264 implementation SEGV-crashed five times in one night of ordinary
 * playback, taking the player off screen each time. Cheap sticks and older signage
 * boxes are no better.
 *
 * BOTH dimensions matter, which is why there are two numbers. The old policy
 * capped only the height, so an ultra-wide clip (e.g. 3000x1000) passed straight
 * through — its height was already legal — and landed on devices undecodable.
 */
export const VIDEO_TRANSCODE_MAX_WIDTH = 1920;
export const VIDEO_TRANSCODE_MAX_HEIGHT = 1088;

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

/**
 * PowerPoint slideshow rendering (see PptxRenderService). Microsoft Graph
 * converts `.pptx → PDF` for us; poppler (`pdftoppm`) rasterizes each page and
 * sharp re-encodes to WebP for the signage image slideshow.
 */
/** DPI passed to `pdftoppm`. 150 keeps 16:9 slides crisp on 1080p screens. */
export const PPTX_SLIDE_RENDER_DPI = 150;
/** Slides are downscaled to at most this width before WebP encoding. */
export const PPTX_SLIDE_MAX_WIDTH = 1920;
/** WebP quality for rendered slides (matches the original-image setting). */
export const PPTX_SLIDE_WEBP_QUALITY = ORIGINAL_IMAGE_WEBP_QUALITY;
/** Hard cap on rendered slides, so a huge deck can't exhaust CPU/storage. */
export const PPTX_MAX_SLIDES = 100;
/** Max bytes accepted for the Graph PDF rendition (SSRF/DoS guard). */
export const PPTX_PDF_MAX_BYTES = 100 * 1024 * 1024;
/** Timeouts for the Graph PDF fetch (redirect resolve + body download). */
export const PPTX_PDF_METADATA_TIMEOUT_MS = 15 * 1000;
export const PPTX_PDF_DOWNLOAD_TIMEOUT_MS = 60 * 1000;

/**
 * Connector asset mirroring (see AssetMirrorService). Re-hosts images a provider
 * only exposes behind a temporary or authenticated URL (Google Slides thumbnail
 * exports) as permanent WebP objects the player can cache and play offline.
 */
/** Mirrored images are downscaled to at most this width before WebP encoding. */
export const ASSET_MIRROR_MAX_WIDTH = PPTX_SLIDE_MAX_WIDTH;
/** WebP quality for mirrored images (matches rendered PowerPoint slides). */
export const ASSET_MIRROR_WEBP_QUALITY = PPTX_SLIDE_WEBP_QUALITY;
/** Max bytes accepted per source image (SSRF/DoS guard). */
export const ASSET_MIRROR_MAX_BYTES = 25 * 1024 * 1024;
/** Per-image download budget. */
export const ASSET_MIRROR_TIMEOUT_MS = 30 * 1000;
/**
 * How many source images to download at once. Bounded so mirroring a 100-slide
 * deck doesn't open 100 sockets to the provider and trip its rate limiter.
 */
export const ASSET_MIRROR_CONCURRENCY = 6;
