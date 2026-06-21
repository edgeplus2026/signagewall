import type { ConfigSchema, DataSource, RuntimeKind } from '@edge/apps-contract';

import { AppDocument, AppStatus } from '../schemas/app.schema';

export interface AppAccentDto {
  logo: string;
  glow: string;
}

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
  iconUrl?: string;
  screenshots: string[];
  accent?: AppAccentDto;
  /** Whether the requesting organization has installed this app. */
  isInstalled: boolean;
}

/** Full catalog shape for super-admin management (adds governance fields). */
export interface AppAdminResponseDto extends AppCatalogResponseDto {
  isPublic: boolean;
  status: AppStatus;
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
  ...(app.iconUrl ? { iconUrl: app.iconUrl } : {}),
  screenshots: app.screenshots ?? [],
  ...(app.accent
    ? { accent: { logo: app.accent.logo, glow: app.accent.glow } }
    : {}),
});

export const toAppAdminResponse = (app: AppDocument): AppAdminResponseDto => ({
  ...toAppCatalogResponse(app),
  isPublic: app.isPublic,
  status: app.status,
  createdAt: app.createdAt.toISOString(),
  updatedAt: app.updatedAt.toISOString(),
});
