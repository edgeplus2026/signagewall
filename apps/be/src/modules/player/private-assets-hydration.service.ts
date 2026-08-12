import { Injectable } from '@nestjs/common';

import {
  isHydratedPrivateAssetRef,
  isPrivateAssetRef,
  type HydratedPrivateAssetRef,
  type PrivateAssetRef,
} from '@signagewall/apps-contract';
import { BusinessException } from '../../common/exceptions/business.exception';
import { AppInstancesRepository } from '../apps/app-instances.repository';
import {
  PrivateAssetOwner,
  PrivateR2StorageService,
} from '../media/storage/private-r2-storage.service';
import { PlaylistsRepository } from '../playlists/playlists.repository';
import { PlaylistItemType } from '../playlists/schemas/playlist.schema';
import { ScreensRepository } from '../screens/screens.repository';
import { ScreenItemType } from '../screens/schemas/screen.schema';

type PrivateAssetSigner = (
  ref: PrivateAssetRef,
) => HydratedPrivateAssetRef | Promise<HydratedPrivateAssetRef>;

/**
 * Authorization boundary for turning inert private refs into temporary URLs.
 * The caller must calculate the logical snapshot revision before invoking it.
 */
@Injectable()
export class PrivateAssetsHydrationService {
  constructor(
    private readonly appInstancesRepository: AppInstancesRepository,
    private readonly screensRepository: ScreensRepository,
    private readonly playlistsRepository: PlaylistsRepository,
    private readonly privateStorage: PrivateR2StorageService,
  ) {}

  async hydrateForPlayer<T>(params: {
    organizationId: string;
    screenId: string;
    appInstanceId: string;
    payload: T;
  }): Promise<T> {
    const [instance, screen] = await Promise.all([
      this.appInstancesRepository.findById(
        params.organizationId,
        params.appInstanceId,
      ),
      this.screensRepository.findById(params.organizationId, params.screenId),
    ]);
    if (!instance || !screen) {
      throw accessDenied();
    }

    const assignedDirectly = screen.items.some(
      (item) =>
        !item.disabled &&
        item.type === ScreenItemType.APP &&
        item.appInstanceId?.toString() === params.appInstanceId,
    );
    const assignedThroughPlaylist = assignedDirectly
      ? false
      : await this.isAssignedThroughPlaylist(
          params.organizationId,
          params.appInstanceId,
          screen.items,
        );
    if (!assignedDirectly && !assignedThroughPlaylist) {
      throw accessDenied();
    }

    return this.hydrateOwnedPayload(
      params.organizationId,
      params.appInstanceId,
      instance.config.connectionId,
      params.payload,
    );
  }

  private async hydrateOwnedPayload<T>(
    organizationId: string,
    appInstanceId: string,
    connectionId: unknown,
    payload: T,
  ): Promise<T> {
    if (typeof connectionId !== 'string' || !connectionId) {
      if (containsPrivateAssetRef(payload)) {
        throw accessDenied();
      }
      return payload;
    }
    const owner: PrivateAssetOwner = {
      organizationId,
      appInstanceId,
      connectionId,
    };
    return hydratePrivateAssetRefs(payload, (ref) => ({
      ...ref,
      url: this.privateStorage.signGetUrl(owner, ref),
    }));
  }

  private async isAssignedThroughPlaylist(
    organizationId: string,
    appInstanceId: string,
    screenItems: ReadonlyArray<{
      type: ScreenItemType;
      disabled: boolean;
      playlistId?: { toString(): string };
    }>,
  ): Promise<boolean> {
    const playlistIds = screenItems.flatMap((item) =>
      !item.disabled && item.type === ScreenItemType.PLAYLIST && item.playlistId
        ? [item.playlistId.toString()]
        : [],
    );
    for (const playlistId of playlistIds) {
      const playlist = await this.playlistsRepository.findById(
        organizationId,
        playlistId,
      );
      if (
        playlist?.items.some(
          (item) =>
            !item.disabled &&
            item.type === PlaylistItemType.APP &&
            item.appInstanceId?.toString() === appInstanceId,
        )
      ) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Recursively hydrate refs without mutating the cached connector payload.
 * Duplicate refs are signed once per pass. A malformed ref marker fails closed.
 */
export async function hydratePrivateAssetRefs<T>(
  payload: T,
  signer: PrivateAssetSigner,
): Promise<T> {
  const signed = new Map<string, Promise<HydratedPrivateAssetRef>>();
  const visiting = new WeakSet<object>();

  const visit = async (value: unknown): Promise<unknown> => {
    if (!value || typeof value !== 'object') {
      return value;
    }
    if (isPrivateAssetMarker(value)) {
      if (!isPrivateAssetRef(value)) {
        throw new Error('Malformed private asset reference');
      }
      const identity = `${value.key}\n${value.version}\n${value.mimeType}`;
      let pending = signed.get(identity);
      if (!pending) {
        const credentialFreeRef: PrivateAssetRef = {
          kind: 'private-asset',
          key: value.key,
          version: value.version,
          mimeType: value.mimeType,
        };
        pending = Promise.resolve(signer(credentialFreeRef));
        signed.set(identity, pending);
      }
      return pending;
    }
    if (!isPlainObject(value) && !Array.isArray(value)) {
      return value;
    }
    if (visiting.has(value)) {
      throw new Error('Cyclic private asset payload');
    }
    visiting.add(value);
    try {
      if (Array.isArray(value)) {
        return Promise.all(value.map(visit));
      }
      const entries = await Promise.all(
        Object.entries(value).map(async ([key, nested]) => [
          key,
          await visit(nested),
        ]),
      );
      return Object.fromEntries(entries);
    } finally {
      visiting.delete(value);
    }
  };

  return (await visit(payload)) as T;
}

export function containsPrivateAssetRef(value: unknown): boolean {
  if (isPrivateAssetRef(value) || isHydratedPrivateAssetRef(value)) {
    return true;
  }
  if (Array.isArray(value)) {
    return value.some(containsPrivateAssetRef);
  }
  if (isPlainObject(value)) {
    return Object.values(value).some(containsPrivateAssetRef);
  }
  return false;
}

function isPrivateAssetMarker(value: object): boolean {
  return (value as Record<string, unknown>).kind === 'private-asset';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function accessDenied(): BusinessException {
  return BusinessException.forbidden('Private asset access denied');
}
