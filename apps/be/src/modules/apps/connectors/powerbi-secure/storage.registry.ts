import type { PrivateR2StorageService } from '../../../media/storage/private-r2-storage.service';

export type PowerBiPrivateStorage = Pick<
  PrivateR2StorageService,
  'isConfigured' | 'uploadAsset' | 'deleteReplacedAssets' | 'deleteAssetSet'
>;

let storage: PowerBiPrivateStorage | undefined;

/** DI bridge: the Apps module should register its PrivateR2StorageService here. */
export function registerPowerBiPrivateStorage(
  value: PowerBiPrivateStorage,
): void {
  storage = value;
}

export function getPowerBiPrivateStorage(): PowerBiPrivateStorage | undefined {
  return storage;
}

/** Test/bootstrap cleanup; never deletes objects. */
export function clearPowerBiPrivateStorage(): void {
  storage = undefined;
}
