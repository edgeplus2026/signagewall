import { renderEmailLayout } from './base.layout';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * The one and only warning before a free account is erased. Sent ~24h out, so
 * it has to be unambiguous about what is lost and what to do about it — no soft
 * "your trial is ending soon" framing.
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
      <p style="margin:0 0 12px;">When it does, your account and everything in it — screens, playlists, uploaded media and paired devices — is permanently deleted. We cannot restore it afterwards.</p>
      <p style="margin:0;">To keep your setup, open the dashboard and use <strong>Upgrade plan</strong> to tell us how many screens you need. We will send an invoice and lift the limit on your account.</p>
    `,
      ctaLabel: 'Upgrade my plan',
      ctaUrl: params.upgradeUrl,
      footerNote:
        'If you no longer need SignageWall, you can ignore this email and the account will be removed automatically.',
    }),
  };
};
