import { Injectable } from '@nestjs/common';
import {
  isPrivateAssetRef,
  type HydratedPrivateAssetRef,
  type PrivateAssetRef,
} from '@signagewall/apps-contract';

import { BusinessException } from '../../common/exceptions/business.exception';
import { PrivateR2StorageService } from '../media/storage/private-r2-storage.service';
import { AppInstancesRepository } from './app-instances.repository';

/** Hydrates private refs only after proving CMS ownership of the saved instance. */
@Injectable()
export class PrivateAssetsPreviewService {
  constructor(
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly privateStorage: PrivateR2StorageService,
  ) {}

  async hydrate<T>(params: {
    organizationId: string;
    appInstanceId: string;
    payload: T;
  }): Promise<T> {
    const instance = await this.appInstancesRepository.findById(
      params.organizationId,
      params.appInstanceId,
    );
    if (!instance) throw accessDenied();

    const connectionId = instance.config.connectionId;
    if (typeof connectionId !== 'string' || !connectionId) {
      if (containsPrivateMarker(params.payload)) throw accessDenied();
      return params.payload;
    }

    const owner = {
      organizationId: params.organizationId,
      appInstanceId: params.appInstanceId,
      connectionId,
    };
    return hydratePreviewRefs(params.payload, (ref) => ({
      ...ref,
      url: this.privateStorage.signGetUrl(owner, ref),
    }));
  }
}

async function hydratePreviewRefs<T>(
  payload: T,
  signer: (
    ref: PrivateAssetRef,
  ) => HydratedPrivateAssetRef | Promise<HydratedPrivateAssetRef>,
): Promise<T> {
  const signed = new Map<string, Promise<HydratedPrivateAssetRef>>();
  const visiting = new WeakSet<object>();

  const visit = async (value: unknown): Promise<unknown> => {
    if (!value || typeof value !== 'object') return value;
    if ((value as Record<string, unknown>).kind === 'private-asset') {
      if (!isPrivateAssetRef(value)) {
        throw new Error('Malformed private asset reference');
      }
      const identity = `${value.key}\n${value.version}\n${value.mimeType}`;
      let result = signed.get(identity);
      if (!result) {
        result = Promise.resolve(
          signer({
            kind: 'private-asset',
            key: value.key,
            version: value.version,
            mimeType: value.mimeType,
          }),
        );
        signed.set(identity, result);
      }
      return result;
    }
    if (!Array.isArray(value) && !isPlainObject(value)) return value;
    if (visiting.has(value)) throw new Error('Cyclic private asset payload');
    visiting.add(value);
    try {
      if (Array.isArray(value)) return Promise.all(value.map(visit));
      return Object.fromEntries(
        await Promise.all(
          Object.entries(value).map(async ([key, nested]) => [
            key,
            await visit(nested),
          ]),
        ),
      );
    } finally {
      visiting.delete(value);
    }
  };

  return (await visit(payload)) as T;
}

function containsPrivateMarker(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  if ((value as Record<string, unknown>).kind === 'private-asset') return true;
  if (Array.isArray(value)) return value.some(containsPrivateMarker);
  if (isPlainObject(value)) {
    return Object.values(value).some(containsPrivateMarker);
  }
  return false;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function accessDenied(): BusinessException {
  return BusinessException.forbidden('Private asset access denied');
}
