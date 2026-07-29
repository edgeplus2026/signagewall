import { renderEmailLayout } from './base.layout';

export const renderEmailVerificationEmail = (params: {
  name: string;
  verifyUrl: string;
}): { subject: string; html: string } => ({
  subject: 'Verify your SignageWall email',
  html: renderEmailLayout({
    previewText: 'Confirm your email to activate your SignageWall account',
    title: 'Verify your email',
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${params.name},</p>
      <p style="margin:0;">Thanks for signing up. Please confirm your email address to activate your account. This link expires in 24 hours.</p>
    `,
    ctaLabel: 'Verify email',
    ctaUrl: params.verifyUrl,
  }),
});
