import type { CrmLeadDto } from '../../crm/crm.mapper';
import { CrmLeadType } from '../../crm/schemas/crm-lead.schema';
import { renderEmailLayout } from './base.layout';

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const row = (label: string, value: string): string =>
  `<tr><td style="padding:4px 12px 4px 0;color:#71717a;vertical-align:top;">${label}</td><td style="padding:4px 0;color:#18181b;font-weight:600;">${escapeHtml(value)}</td></tr>`;

export const renderCrmLeadEmail = (
  lead: CrmLeadDto,
): { subject: string; html: string } => ({
  subject:
    lead.type === CrmLeadType.QUOTE
      ? 'New quote request'
      : 'New contact request',
  html: renderEmailLayout({
    previewText: `${lead.name} submitted a ${lead.type} request`,
    title:
      lead.type === CrmLeadType.QUOTE
        ? 'New quote request'
        : 'New contact request',
    bodyHtml: `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 16px;font-size:14px;line-height:1.6;">
        ${row('Name', lead.name)}
        ${row('Email', lead.email)}
        ${row('Phone', lead.phone ?? '—')}
        ${row('Company', lead.company ?? '—')}
        ${lead.screenQuantity !== undefined ? row('Screens', lead.screenQuantity.toString()) : ''}
        ${lead.city ? row('City', lead.city) : ''}
        ${lead.country ? row('Country', lead.country) : ''}
        ${row('Source', lead.firstTouch?.source ?? 'direct')}
        ${row('Campaign', lead.firstTouch?.campaign ?? '—')}
      </table>
      <p style="margin:0 0 8px;"><strong>Message:</strong></p>
      <p style="margin:0;white-space:pre-wrap;">${escapeHtml(lead.message)}</p>
    `,
    footerNote: 'The durable lead record is available in Super admin → CRM.',
  }),
});
