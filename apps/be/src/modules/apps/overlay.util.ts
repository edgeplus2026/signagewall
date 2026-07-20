import { APP_MANIFESTS } from '@edge/apps';

/** Slugs of overlay apps (manifest `overlay: true`), e.g. the ticker band. */
export const OVERLAY_SLUGS: ReadonlySet<string> = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.overlay).map(
    (manifest) => manifest.slug,
  ),
);

export function isOverlaySlug(slug: string): boolean {
  return OVERLAY_SLUGS.has(slug);
}

/**
 * The screen ids an overlay instance's config assigns it to (its `screens`
 * field), tolerant of malformed configs.
 */
export function overlayScreenIds(config: Record<string, unknown>): string[] {
  const screens = config.screens;
  return Array.isArray(screens)
    ? screens.filter((id): id is string => typeof id === 'string' && id !== '')
    : [];
}
