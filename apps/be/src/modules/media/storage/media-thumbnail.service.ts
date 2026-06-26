import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

import {
  ALLOWED_IMAGE_MIME_TYPES,
  ORIGINAL_IMAGE_MAX_WIDTH,
  ORIGINAL_IMAGE_WEBP_QUALITY,
  THUMBNAIL_LARGE_MAX_WIDTH,
  THUMBNAIL_SMALL_MAX_WIDTH,
  VIDEO_PLACEHOLDER_HEIGHT,
  VIDEO_PLACEHOLDER_WIDTH,
} from '../media.constants';

export interface GeneratedImageThumbnails {
  small: Buffer;
  large: Buffer;
  width?: number;
  height?: number;
}

export interface CompressedImage {
  buffer: Buffer;
  width?: number;
  height?: number;
}

@Injectable()
export class MediaThumbnailService {
  /**
   * Re-encodes an original image to WebP (downscaling to a max width) before it
   * is stored on R2, to keep storage within the free tier. Animated GIFs are
   * preserved as animated WebP. EXIF orientation is baked in via `rotate()` so
   * the stored pixels are upright once the orientation metadata is stripped.
   *
   * PNG sources are encoded **losslessly** — they're typically logos,
   * screenshots, or text-heavy graphics where lossy artifacts are visible (and
   * lossless WebP is usually still smaller than the source PNG). Photos
   * (JPEG) and GIFs stay lossy at the standard quality.
   */
  async compressOriginalImage(
    buffer: Buffer,
    mimeType: string,
  ): Promise<CompressedImage> {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new Error(`Unsupported image mime type: ${mimeType}`);
    }

    const isAnimated = mimeType === 'image/gif';
    const isPng = mimeType === 'image/png';

    const output = await sharp(buffer, {
      failOn: 'none',
      animated: isAnimated,
    })
      .rotate()
      .resize({
        width: ORIGINAL_IMAGE_MAX_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp(
        isPng ? { lossless: true } : { quality: ORIGINAL_IMAGE_WEBP_QUALITY },
      )
      .toBuffer({ resolveWithObject: true });

    return {
      buffer: output.data,
      width: output.info.width,
      // For animated images Sharp reports the height of all frames stacked
      // (pageHeight is the per-frame height); fall back to the frame height.
      height: output.info.pageHeight ?? output.info.height,
    };
  }

  async generateImageThumbnails(
    buffer: Buffer,
    mimeType: string,
  ): Promise<GeneratedImageThumbnails> {
    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new Error(`Unsupported image mime type: ${mimeType}`);
    }

    const image = sharp(buffer, { failOn: 'none' });
    const metadata = await image.metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    const [small, large] = await Promise.all([
      sharp(buffer)
        .rotate()
        .resize({
          width: THUMBNAIL_SMALL_MAX_WIDTH,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 80 })
        .toBuffer(),
      sharp(buffer)
        .rotate()
        .resize({
          width: THUMBNAIL_LARGE_MAX_WIDTH,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer(),
    ]);

    return { small, large, width, height };
  }

  /**
   * Builds a solid placeholder thumbnail for a video. We intentionally do NOT
   * run Sharp against the video bytes — Sharp cannot decode video containers
   * (mp4/webm/mov) and `metadata()` would throw, failing every video upload.
   * Real poster-frame extraction would require ffmpeg; until that exists we
   * render a neutral placeholder at a fixed 16:9 size. `dimensions`, when the
   * caller can supply them (e.g. probed client-side), only annotate the stored
   * metadata and never touch decoding.
   */
  async generateVideoPlaceholder(dimensions?: {
    width?: number;
    height?: number;
  }): Promise<GeneratedImageThumbnails> {
    const large = await sharp({
      create: {
        width: VIDEO_PLACEHOLDER_WIDTH,
        height: VIDEO_PLACEHOLDER_HEIGHT,
        channels: 3,
        background: { r: 24, g: 24, b: 27 },
      },
    })
      .webp({ quality: 85 })
      .toBuffer();

    const small = await sharp(large)
      .resize({
        width: THUMBNAIL_SMALL_MAX_WIDTH,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();

    return {
      small,
      large,
      // Leave undefined when unknown so the UI shows "—" instead of a fake
      // resolution; only annotate when the caller supplies real dimensions.
      width: dimensions?.width,
      height: dimensions?.height,
    };
  }
}
