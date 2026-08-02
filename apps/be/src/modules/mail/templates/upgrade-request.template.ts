import { renderEmailLayout } from './base.layout';

export interface UpgradeRequestEmailContext {
  userName: string;
  userEmail: string;
  phone?: string;
  company?: string;
  currentPlan: string;
  currentScreenLimit: number | null;
  screensUsed: number;
  requestedScreens: number;
  message?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const row = (label: string, value: string): string =>
  `<tr><td style="padding:4px 0;"><strong>${label}:</strong> ${escapeHtml(value)}</td></tr>`;

/** Internal lead notification — the durable copy is the upgrade-request row. */
export const renderUpgradeRequestEmail = (
  context: UpgradeRequestEmailContext,
): { subject: string; html: string } => ({
  subject: `Upgrade request: ${context.userName} wants ${context.requestedScreens.toString()} screens`,
  html: renderEmailLayout({
    previewText: `${context.userName} requested ${context.requestedScreens.toString()} screens`,
    title: 'New upgrade request',
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
        ${row('User', context.userName)}
        ${row('Email', context.userEmail)}
        ${row('Phone', context.phone ?? '—')}
        ${row('Company', context.company ?? '—')}
        ${row('Current plan', context.currentPlan)}
        ${row('Current licences', context.currentScreenLimit === null ? 'unlimited' : context.currentScreenLimit.toString())}
        ${row('Screens in use', context.screensUsed.toString())}
        ${row('Screens requested', context.requestedScreens.toString())}
      </table>
      ${
        context.message
          ? `<p style="margin:0 0 8px;"><strong>Message:</strong></p>
             <p style="margin:0;white-space:pre-wrap;">${escapeHtml(context.message)}</p>`
          : ''
      }
    `,
    footerNote:
      'Set the plan and licence count from Super admin → Users → Change plan.',
  }),
});
