import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { extname } from 'path';

import { BusinessException } from '../../common/exceptions/business.exception';
import { R2StorageService } from '../media/storage/r2-storage.service';

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
  'image/gif',
]);

export interface UploadedAssetDto {
  url: string;
  key: string;
}

/**
 * Uploads catalog presentation assets (app icons, screenshots) to a global R2
 * namespace shared across all organizations — distinct from org-scoped media.
 */
@Injectable()
export class AppAssetsService {
  constructor(private readonly storage: R2StorageService) {}

  async uploadImage(file: Express.Multer.File): Promise<UploadedAssetDto> {
    if (!file?.buffer?.length) {
      throw BusinessException.badRequest('No file provided');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw BusinessException.badRequest('Unsupported image type');
    }

    const ext = extname(file.originalname).toLowerCase() || '.png';
    const key = `apps/assets/${randomUUID()}${ext}`;
    await this.storage.uploadObject(key, file.buffer, file.mimetype);

    const url = this.storage.getPublicUrl(key);
    if (!url) {
      throw BusinessException.badRequest('Storage is not configured');
    }
    return { url, key };
  }
}
