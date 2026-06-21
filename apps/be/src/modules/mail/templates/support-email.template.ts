import { renderEmailLayout } from './base.layout';

export interface SupportEmailContext {
  userName: string;
  userEmail: string;
  organizationId: string;
  organizationName: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const renderSupportContextHtml = (context: SupportEmailContext): string => `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;line-height:1.6;color:#3f3f46;">
    <tr><td style="padding:4px 0;"><strong>User:</strong> ${escapeHtml(context.userName)}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Email:</strong> ${escapeHtml(context.userEmail)}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Organization ID:</strong> ${escapeHtml(context.organizationId)}</td></tr>
    <tr><td style="padding:4px 0;"><strong>Organization:</strong> ${escapeHtml(context.organizationName)}</td></tr>
  </table>
`;

export const renderFeedbackEmail = (
  context: SupportEmailContext,
  rating: number,
  message: string,
): { subject: string; html: string } => ({
  subject: `Edge feedback (${rating}/5) from ${context.userName}`,
  html: renderEmailLayout({
    previewText: `New feedback from ${context.userName}`,
    title: 'New user feedback',
    bodyHtml: `
      ${renderSupportContextHtml(context)}
      <p style="margin:0 0 8px;"><strong>Rating:</strong> ${rating}/5</p>
      <p style="margin:0 0 8px;"><strong>Message:</strong></p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    `,
    footerNote: 'This message was sent from Edge Settings → Leave feedback.',
  }),
});

export const renderReportProblemEmail = (
  context: SupportEmailContext,
  message: string,
): { subject: string; html: string } => ({
  subject: `Edge problem report from ${context.userName}`,
  html: renderEmailLayout({
    previewText: `New problem report from ${context.userName}`,
    title: 'New problem report',
    bodyHtml: `
      ${renderSupportContextHtml(context)}
      <p style="margin:0 0 8px;"><strong>Message:</strong></p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(message)}</p>
    `,
    footerNote: 'This message was sent from Edge Settings → Report a problem.',
  }),
});
