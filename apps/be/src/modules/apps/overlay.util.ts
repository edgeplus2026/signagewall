import { APP_MANIFESTS } from '@signagewall/apps';

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
 * Slugs of overlay apps that take over the whole screen (manifest `takeover`),
 * i.e. the emergency alert — as opposed to the ones that pin a band to an edge.
 */
export const TAKEOVER_SLUGS: ReadonlySet<string> = new Set(
  APP_MANIFESTS.filter((manifest) => manifest.takeover).map(
    (manifest) => manifest.slug,
  ),
);

export function isTakeoverSlug(slug: string): boolean {
  return TAKEOVER_SLUGS.has(slug);
}

/**
 * Whether an overlay instance should actually be sent to a screen right now.
 *
 * Band overlays are always live — the ticker is on because it exists. A takeover
 * is the opposite: it is written and assigned in advance and left switched off,
 * so it only counts while its `active` switch is on. Excluding an inactive one
 * here rather than letting the bundle render nothing is what makes a configured
 * alert cost a screen exactly nothing: it never reaches the snapshot, so it
 * never changes a revision, never mounts an iframe, and never covers anything.
 */
export function isOverlayLive(
  slug: string,
  config: Record<string, unknown>,
): boolean {
  return isTakeoverSlug(slug) ? config.active === true : true;
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
