import { inflateRawSync } from 'node:zlib';

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ZIP_LOCAL_FILE = 0x04034b50;
const ZIP_CENTRAL_FILE = 0x02014b50;
const ZIP_END = 0x06054b50;
const MAX_ZIP_COMMENT = 0xffff;

export const POWERBI_EXPORT_MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
export const POWERBI_EXPORT_MAX_PAGE_BYTES = 25 * 1024 * 1024;
export const POWERBI_EXPORT_MAX_TOTAL_PAGE_BYTES = 150 * 1024 * 1024;
export const POWERBI_EXPORT_MAX_PAGES = 50;

export interface ExportedPngPage {
  filename: string;
  body: Buffer;
}

export class UnsafePowerBiExportError extends Error {
  readonly name = 'UnsafePowerBiExportError';
}

function hasControlCharacters(value: string): boolean {
  return [...value].some((character) => {
    const code = character.charCodeAt(0);
    return code < 0x20 || code === 0x7f;
  });
}

function fail(message: string): never {
  throw new UnsafePowerBiExportError(`Power BI export rejected: ${message}`);
}

function isPng(body: Buffer): boolean {
  return (
    body.length >= PNG_SIGNATURE.length &&
    body.subarray(0, 8).equals(PNG_SIGNATURE)
  );
}

function safeArchivePath(name: string): boolean {
  if (
    !name ||
    name.length > 512 ||
    name.startsWith('/') ||
    name.startsWith('\\') ||
    /^[A-Za-z]:/.test(name) ||
    name.includes('\\') ||
    hasControlCharacters(name)
  ) {
    return false;
  }
  return !name
    .split('/')
    .some((part) => part === '' || part === '.' || part === '..');
}

function findEndOfCentralDirectory(body: Buffer): number {
  const start = Math.max(0, body.length - (22 + MAX_ZIP_COMMENT));
  for (let offset = body.length - 22; offset >= start; offset -= 1) {
    if (body.readUInt32LE(offset) === ZIP_END) return offset;
  }
  return -1;
}

interface ZipEntry {
  name: string;
  flags: number;
  method: number;
  crc: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function parseEntries(body: Buffer): ZipEntry[] {
  const eocd = findEndOfCentralDirectory(body);
  if (eocd < 0) fail('invalid ZIP footer');
  if (eocd + 22 > body.length) fail('truncated ZIP footer');
  const disk = body.readUInt16LE(eocd + 4);
  const centralDisk = body.readUInt16LE(eocd + 6);
  const diskEntries = body.readUInt16LE(eocd + 8);
  const totalEntries = body.readUInt16LE(eocd + 10);
  const centralSize = body.readUInt32LE(eocd + 12);
  const centralOffset = body.readUInt32LE(eocd + 16);
  const commentLength = body.readUInt16LE(eocd + 20);
  if (disk !== 0 || centralDisk !== 0 || diskEntries !== totalEntries) {
    fail('multi-disk ZIP files are unsupported');
  }
  if (
    totalEntries === 0xffff ||
    centralSize === 0xffffffff ||
    centralOffset === 0xffffffff
  ) {
    fail('ZIP64 files are unsupported');
  }
  if (totalEntries > POWERBI_EXPORT_MAX_PAGES + 8)
    fail('too many archive entries');
  if (eocd + 22 + commentLength !== body.length)
    fail('trailing or truncated ZIP data');
  if (centralOffset + centralSize !== eocd)
    fail('invalid ZIP directory bounds');

  const entries: ZipEntry[] = [];
  const names = new Set<string>();
  let offset = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    if (offset + 46 > eocd || body.readUInt32LE(offset) !== ZIP_CENTRAL_FILE) {
      fail('invalid ZIP directory entry');
    }
    const flags = body.readUInt16LE(offset + 8);
    const method = body.readUInt16LE(offset + 10);
    const crc = body.readUInt32LE(offset + 16);
    const compressedSize = body.readUInt32LE(offset + 20);
    const uncompressedSize = body.readUInt32LE(offset + 24);
    const nameLength = body.readUInt16LE(offset + 28);
    const extraLength = body.readUInt16LE(offset + 30);
    const entryCommentLength = body.readUInt16LE(offset + 32);
    const localOffset = body.readUInt32LE(offset + 42);
    const next = offset + 46 + nameLength + extraLength + entryCommentLength;
    if (next > eocd) fail('truncated ZIP directory entry');
    const name = body
      .subarray(offset + 46, offset + 46 + nameLength)
      .toString('utf8');
    if (!safeArchivePath(name)) fail('unsafe archive path');
    if (names.has(name)) fail('duplicate archive path');
    names.add(name);
    if ((flags & 0x1) !== 0) fail('encrypted ZIP entries are unsupported');
    if (
      (flags & 0x800) === 0 &&
      [...name].some((character) => character.charCodeAt(0) > 0x7f)
    ) {
      fail('non-UTF-8 archive paths are unsupported');
    }
    if (method !== 0 && method !== 8) fail('unsupported ZIP compression');
    if (compressedSize > POWERBI_EXPORT_MAX_DOWNLOAD_BYTES)
      fail('compressed entry is too large');
    if (uncompressedSize > POWERBI_EXPORT_MAX_PAGE_BYTES)
      fail('page is too large');
    entries.push({
      name,
      flags,
      method,
      crc,
      compressedSize,
      uncompressedSize,
      localOffset,
    });
    offset = next;
  }
  if (offset !== eocd) fail('invalid ZIP directory size');
  return entries;
}

function extractEntry(body: Buffer, entry: ZipEntry): Buffer {
  const offset = entry.localOffset;
  if (
    offset + 30 > body.length ||
    body.readUInt32LE(offset) !== ZIP_LOCAL_FILE
  ) {
    fail('invalid local ZIP entry');
  }
  const flags = body.readUInt16LE(offset + 6);
  const method = body.readUInt16LE(offset + 8);
  const nameLength = body.readUInt16LE(offset + 26);
  const extraLength = body.readUInt16LE(offset + 28);
  const dataOffset = offset + 30 + nameLength + extraLength;
  const dataEnd = dataOffset + entry.compressedSize;
  if (
    dataEnd > body.length ||
    flags !== entry.flags ||
    method !== entry.method
  ) {
    fail('ZIP entry metadata mismatch');
  }
  const localName = body
    .subarray(offset + 30, offset + 30 + nameLength)
    .toString('utf8');
  if (localName !== entry.name) fail('ZIP entry name mismatch');
  const compressed = body.subarray(dataOffset, dataEnd);
  let output: Buffer;
  try {
    output =
      entry.method === 0
        ? Buffer.from(compressed)
        : inflateRawSync(compressed, {
            maxOutputLength: POWERBI_EXPORT_MAX_PAGE_BYTES + 1,
          });
  } catch {
    fail('page decompression failed');
  }
  if (output.length !== entry.uncompressedSize) fail('page size mismatch');
  if (crc32(output) !== entry.crc) fail('page checksum mismatch');
  return output;
}

/** Parse Microsoft's PNG export, which is either one PNG or a ZIP of PNG pages. */
export function parsePowerBiPngExport(body: Buffer): ExportedPngPage[] {
  if (body.length === 0 || body.length > POWERBI_EXPORT_MAX_DOWNLOAD_BYTES) {
    fail('download size is outside the allowed range');
  }
  if (isPng(body)) {
    if (body.length > POWERBI_EXPORT_MAX_PAGE_BYTES) fail('page is too large');
    return [{ filename: 'page-001.png', body }];
  }

  const entries = parseEntries(body);
  const files = entries.filter((entry) => !entry.name.endsWith('/'));
  if (files.length === 0) fail('archive has no pages');
  if (files.length > POWERBI_EXPORT_MAX_PAGES)
    fail('archive has too many pages');
  if (files.some((entry) => !/\.png$/i.test(entry.name))) {
    fail('archive contains a non-PNG file');
  }
  const total = files.reduce((sum, entry) => sum + entry.uncompressedSize, 0);
  if (total > POWERBI_EXPORT_MAX_TOTAL_PAGE_BYTES)
    fail('uncompressed export is too large');

  return files.map((entry, index) => {
    const page = extractEntry(body, entry);
    if (!isPng(page)) fail('archive entry is not a PNG image');
    return {
      filename: `page-${String(index + 1).padStart(3, '0')}.png`,
      body: page,
    };
  });
}

/**
 * Standard CRC-32 lookup table, built once at module load.
 *
 * The bit-serial form this replaces did eight shift/xor rounds PER BYTE, on
 * exports that can reach ~100 MB — tens of millions of iterations on the event
 * loop, blocking every other request for the duration. One table lookup per
 * byte is ~8x less work for an identical result.
 */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value >>> 1) ^ (0xedb88320 & -(value & 1));
    }
    table[index] = value;
  }
  return table;
})();

function crc32(body: Buffer): number {
  let crc = -1;
  for (const byte of body) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}
