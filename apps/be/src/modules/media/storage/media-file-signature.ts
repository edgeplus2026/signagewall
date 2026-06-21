import { AllowedMediaMimeType } from '../media.constants';

/**
 * Lightweight, dependency-free magic-byte validation.
 *
 * The multipart `Content-Type` of an upload is fully client-controlled, so the
 * declared MIME type cannot be trusted on its own. This module inspects the
 * actual leading bytes of the file and confirms they are consistent with the
 * declared (already allow-listed) MIME type. It is intentionally conservative:
 * it only needs to recognize the handful of formats we accept.
 */

const startsWith = (buffer: Buffer, bytes: number[], offset = 0): boolean => {
  if (buffer.length < offset + bytes.length) {
    return false;
  }

  return bytes.every((byte, index) => buffer[offset + index] === byte);
};

const isJpeg = (buffer: Buffer): boolean =>
  startsWith(buffer, [0xff, 0xd8, 0xff]);

const isPng = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

// "GIF87a" or "GIF89a"
const isGif = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x47, 0x49, 0x46, 0x38]);

// "RIFF"...."WEBP"
const isWebp = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x52, 0x49, 0x46, 0x46]) &&
  startsWith(buffer, [0x57, 0x45, 0x42, 0x50], 8);

// EBML header shared by Matroska/WebM
const isWebm = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x1a, 0x45, 0xdf, 0xa3]);

// ISO Base Media File Format: "ftyp" box marker at offset 4 (mp4 + quicktime/mov)
const isIsoBmff = (buffer: Buffer): boolean =>
  startsWith(buffer, [0x66, 0x74, 0x79, 0x70], 4);

const isQuickTimeBrand = (buffer: Buffer): boolean =>
  // major brand "qt  " immediately after the ftyp marker
  startsWith(buffer, [0x71, 0x74, 0x20, 0x20], 8);

/**
 * Returns true when the raw bytes are plausibly the declared MIME type.
 * `declaredMime` is expected to already be one of the allow-listed types.
 */
export const isBufferConsistentWithMime = (
  buffer: Buffer,
  declaredMime: AllowedMediaMimeType,
): boolean => {
  switch (declaredMime) {
    case 'image/jpeg':
      return isJpeg(buffer);
    case 'image/png':
      return isPng(buffer);
    case 'image/gif':
      return isGif(buffer);
    case 'image/webp':
      return isWebp(buffer);
    case 'video/webm':
      return isWebm(buffer);
    case 'video/mp4':
      // Accept any ISO-BMFF container; reject buffers whose major brand is
      // explicitly QuickTime (those should be uploaded as video/quicktime).
      return isIsoBmff(buffer) && !isQuickTimeBrand(buffer);
    case 'video/quicktime':
      return isIsoBmff(buffer);
    default:
      return false;
  }
};
