import { renderEmailLayout } from './base.layout';

export const renderPasswordResetEmail = (params: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } => ({
  subject: 'Reset your Edge password',
  html: renderEmailLayout({
    previewText: 'Reset your Edge account password',
    title: 'Reset your password',
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${params.name},</p>
      <p style="margin:0;">We received a request to reset your password. Click the button below to choose a new one. This link expires in 1 hour.</p>
    `,
    ctaLabel: 'Reset password',
    ctaUrl: params.resetUrl,
  }),
});
