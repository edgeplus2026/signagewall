import { renderEmailLayout } from './base.layout';

export const renderOrganizationInviteEmail = (params: {
  name: string;
  organizationName: string;
  inviteUrl: string;
  isExistingUser: boolean;
}): { subject: string; html: string } => ({
  subject: `Invitation to join ${params.organizationName} on Edge`,
  html: renderEmailLayout({
    previewText: `You have been invited to join ${params.organizationName}`,
    title: `Join ${params.organizationName}`,
    bodyHtml: `
      <p style="margin:0 0 12px;">Hi ${params.name},</p>
      <p style="margin:0;">
        ${
          params.isExistingUser
            ? `You have been invited to join <strong>${params.organizationName}</strong> on Edge. Sign in to review and accept the invitation.`
            : `You have been invited to join <strong>${params.organizationName}</strong> on Edge. Create your account to get started.`
        }
      </p>
    `,
    ctaLabel: params.isExistingUser ? 'Review invitation' : 'Create account',
    ctaUrl: params.inviteUrl,
    footerNote:
      'If you did not expect this invitation, you can ignore this email.',
  }),
});
