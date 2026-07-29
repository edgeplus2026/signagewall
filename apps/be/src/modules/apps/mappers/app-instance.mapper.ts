import type { AppInstanceConfig } from '@signagewall/apps-contract';

import { AppInstanceDocument } from '../schemas/app-instance.schema';

export interface AppInstanceResponseDto {
  id: string;
  appId: string;
  appSlug: string;
  name: string;
  config: AppInstanceConfig;
  configVersion: number;
  createdAt: string;
  updatedAt: string;
}

export const toAppInstanceResponse = (
  instance: AppInstanceDocument,
): AppInstanceResponseDto => ({
  id: instance._id.toString(),
  appId: instance.appId.toString(),
  appSlug: instance.appSlug,
  name: instance.name,
  config: instance.config ?? {},
  configVersion: instance.configVersion,
  createdAt: instance.createdAt.toISOString(),
  updatedAt: instance.updatedAt.toISOString(),
});
