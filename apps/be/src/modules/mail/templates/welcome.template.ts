import { renderEmailLayout } from './base.layout';

export const renderWelcomeEmail = (params: {
  name: string;
  loginUrl: string;
}): { subject: string; html: string } => ({
  subject: 'Welcome to Edge',
  html: renderEmailLayout({
    previewText: 'Your Edge account is ready',
    title: 'Welcome to Edge',
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${params.name},</p>
      <p style="margin:0;">Your account has been created. You can now manage screens, playlists, and media from your dashboard.</p>
    `,
    ctaLabel: 'Go to dashboard',
    ctaUrl: params.loginUrl,
    footerNote: 'Welcome aboard. We are glad to have you with Edge.',
  }),
});
