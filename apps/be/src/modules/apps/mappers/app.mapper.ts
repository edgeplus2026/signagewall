import type {
  ConfigSchema,
  DataSource,
  RuntimeKind,
} from '@edge/apps-contract';

import { AppDocument } from '../schemas/app.schema';

/** Shape an organization needs to browse the catalog and configure instances. */
export interface AppCatalogResponseDto {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  about: string;
  runtimeKind: RuntimeKind;
  dataSource: DataSource;
  configSchema: ConfigSchema;
  version: number;
  iconSvg: string;
  color: string;
  /** Ids of the catalog categories this app belongs to. */
  categoryIds: string[];
  /** Whether the requesting organization has installed this app. */
  isInstalled: boolean;
}

/** Full catalog shape for super-admin management (adds governance fields). */
export interface AppAdminResponseDto extends AppCatalogResponseDto {
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export const toAppCatalogResponse = (
  app: AppDocument,
  isInstalled = false,
): AppCatalogResponseDto => ({
  isInstalled,
  id: app._id.toString(),
  slug: app.slug,
  name: app.name,
  tagline: app.tagline,
  description: app.description,
  about: app.about,
  runtimeKind: app.runtimeKind,
  dataSource: app.dataSource,
  configSchema: app.configSchema ?? [],
  version: app.version,
  iconSvg: app.iconSvg ?? '',
  color: app.color ?? '',
  categoryIds: (app.categoryIds ?? []).map((id) => id.toString()),
});

export const toAppAdminResponse = (app: AppDocument): AppAdminResponseDto => ({
  ...toAppCatalogResponse(app),
  isPublic: app.isPublic,
  createdAt: app.createdAt.toISOString(),
  updatedAt: app.updatedAt.toISOString(),
});
