import { renderEmailLayout } from './base.layout';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export interface OfflineScreenSummary {
  name: string;
  lastSeenAt?: Date;
}

const formatLastSeen = (lastSeenAt?: Date): string =>
  lastSeenAt
    ? lastSeenAt.toLocaleString('en-GB', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      })
    : 'unknown';

/**
 * One email per organization per sweep, listing every screen that just crossed
 * the offline threshold — a site-wide power/network outage reads as one
 * message, not one per display.
 */
export const renderScreenOfflineEmail = (params: {
  organizationName: string;
  screens: OfflineScreenSummary[];
  offlineMinutes: number;
  screensUrl: string;
}): { subject: string; html: string } => {
  const single = params.screens.length === 1;
  const subject = single
    ? `Screen "${params.screens[0].name}" is offline`
    : `${params.screens.length} screens are offline`;

  const rows = params.screens
    .map(
      (screen) => `
        <tr>
          <td style="padding:6px 12px 6px 0;font-weight:600;">${escapeHtml(screen.name)}</td>
          <td style="padding:6px 0;color:#667085;">last seen ${escapeHtml(formatLastSeen(screen.lastSeenAt))}</td>
        </tr>`,
    )
    .join('');

  return {
    subject,
    html: renderEmailLayout({
      previewText: single
        ? `"${params.screens[0].name}" stopped reporting in ${params.organizationName}`
        : `${params.screens.length} screens stopped reporting in ${params.organizationName}`,
      title: single ? 'A screen went offline' : 'Screens went offline',
      bodyHtml: `
      <p style="margin:0 0 12px;">${
        single ? 'This screen has' : 'These screens have'
      } been offline for more than ${params.offlineMinutes} minutes in <strong>${escapeHtml(params.organizationName)}</strong>:</p>
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 12px;border-collapse:collapse;">${rows}
      </table>
      <p style="margin:0 0 12px;">The display keeps playing its last downloaded content while offline, so viewers may not notice yet — but new updates will not reach it until it reconnects.</p>
      <p style="margin:0;">Usual causes: power to the TV or player, the venue's network, or an unplugged cable. You'll only get this email once per outage.</p>
    `,
      ctaLabel: 'Check screen status',
      ctaUrl: params.screensUrl,
      footerNote:
        'You receive outage alerts because you are a member of this workspace.',
    }),
  };
};
