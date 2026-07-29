import { renderEmailLayout } from './base.layout';

/** Escape user-supplied values before interpolating into the email HTML. */
const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Internal notification sent to the SignageWall team whenever a new user registers,
 * listing exactly what they entered on the sign-up form (never the password).
 */
export const renderNewRegistrationEmail = (params: {
  name: string;
  email: string;
  phone: string;
  company?: string;
  viaInvite: boolean;
}): { subject: string; html: string } => {
  const row = (label: string, value: string): string =>
    `<tr>
      <td style="padding:6px 16px 6px 0;font-size:13px;color:#71717a;white-space:nowrap;vertical-align:top;">${label}</td>
      <td style="padding:6px 0;font-size:14px;color:#18181b;font-weight:600;">${escapeHtml(value)}</td>
    </tr>`;

  return {
    subject: `New registration: ${params.name}`,
    html: renderEmailLayout({
      previewText: `${params.name} just registered on SignageWall`,
      title: 'New user registration',
      bodyHtml: `
        <p style="margin:0 0 16px;">A new user has just registered on SignageWall:</p>
        <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse;">
          ${row('Name', params.name)}
          ${row('Email', params.email)}
          ${row('Phone', params.phone)}
          ${params.company ? row('Company', params.company) : ''}
          ${row('Sign-up', params.viaInvite ? 'Via organization invite' : 'Standard sign-up')}
        </table>
      `,
      footerNote: 'Automated notification from SignageWall.',
    }),
  };
};
