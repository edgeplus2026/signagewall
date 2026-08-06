import type {
  ConfigSchema,
  DataSource,
  RuntimeKind,
} from '@signagewall/apps-contract';

import { AppDocument } from '../schemas/app.schema';

/**
 * Shape an organization needs to browse the catalog and configure instances.
 * Copy (tagline/description/about) and categories are intentionally absent —
 * the CMS renders those from its i18n bundle + code registry, keyed by `slug`.
 */
export interface AppCatalogResponseDto {
  id: string;
  slug: string;
  name: string;
  runtimeKind: RuntimeKind;
  dataSource: DataSource;
  configSchema: ConfigSchema;
  version: number;
  /** True for persistent-overlay apps (not addable to content rotations). */
  overlay: boolean;
  iconSvg: string;
  color: string;
  /** Whether the requesting organization has installed this app. */
  isInstalled: boolean;
}

/** One organization's entitlement to a (typically non-public) app. */
export interface AppGrantResponseDto {
  organizationId: string;
  organizationName: string;
  grantedAt: string;
}

/** Full catalog shape for super-admin management (adds governance fields). */
export interface AppAdminResponseDto extends AppCatalogResponseDto {
  isPublic: boolean;
  /** Number of organizations that have installed this app. */
  installCount: number;
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
  runtimeKind: app.runtimeKind,
  dataSource: app.dataSource,
  configSchema: app.configSchema ?? [],
  version: app.version,
  overlay: app.overlay ?? false,
  iconSvg: app.iconSvg ?? '',
  color: app.color ?? '',
});

export const toAppAdminResponse = (
  app: AppDocument,
  installCount = 0,
): AppAdminResponseDto => ({
  ...toAppCatalogResponse(app),
  isPublic: app.isPublic,
  installCount,
  createdAt: app.createdAt.toISOString(),
  updatedAt: app.updatedAt.toISOString(),
});
