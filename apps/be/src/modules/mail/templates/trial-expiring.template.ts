import { renderEmailLayout } from './base.layout';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The one and only warning before a free trial expires. Data and the last
 * player content are retained; the message must not threaten deletion.
 */
export const renderTrialExpiringEmail = (params: {
  name: string;
  expiresAt: Date;
  upgradeUrl: string;
}): { subject: string; html: string } => {
  const expiryDate = params.expiresAt.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return {
    subject: 'Your SignageWall trial ends tomorrow',
    html: renderEmailLayout({
      previewText: 'Upgrade to keep your screens, playlists and media',
      title: 'Your free trial ends tomorrow',
      bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${escapeHtml(params.name)},</p>
      <p style="margin:0 0 12px;">Your SignageWall free trial ends on <strong>${expiryDate}</strong>.</p>
      <p style="margin:0 0 12px;">Your account, screens, playlists and media will be kept. Existing players keep their last downloaded content while billing is reviewed.</p>
      <p style="margin:0;">To continue with a paid plan, open the dashboard and use <strong>Upgrade plan</strong> to tell us how many screens you need. We will send an invoice manually.</p>
    `,
      ctaLabel: 'Upgrade my plan',
      ctaUrl: params.upgradeUrl,
      footerNote:
        'Your data is not automatically deleted when the trial expires.',
    }),
  };
};
