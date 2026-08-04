import type { MetadataRoute } from 'next'

/**
 * Web app manifest.
 *
 * The site declared an apple-touch-icon but no manifest, so every non-Apple
 * device fell back to a screenshot of the page for its home-screen icon and
 * audits reported the site as having none. Deliberately locale-neutral: this
 * route sits above `[locale]`, and the name a visitor pins is the brand either
 * way.
 *
 * `display: 'browser'` on purpose. This is a marketing site, not an app — the
 * player is the installable artefact and lives on the device, and dropping the
 * URL bar on a site whose whole job is to be linked and shared would take away
 * the address people came to copy.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SignageWall',
    short_name: 'SignageWall',
    description:
      'Digital signage software for menus, prices and announcements — manage every screen from one place.',
    start_url: '/',
    display: 'browser',
    // Matches `--page` and `--accent` in the light theme, which is what the
    // browser chrome samples before any CSS has loaded.
    background_color: '#f2f0ea',
    theme_color: '#d85a30',
    icons: [
      { src: '/brand/signagewall-mark.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/brand/signagewall-mark-512.png', type: 'image/png', sizes: '512x512' },
      {
        src: '/brand/signagewall-mark-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
    ],
  }
}
