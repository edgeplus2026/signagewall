import { renderEmailLayout } from './base.layout';

export interface BillingAlertEmailItem {
  severity: 'warning' | 'critical';
  label: string;
  customerName: string;
  customerEmail?: string;
  invoiceNumber?: string;
  dueAt?: string;
}

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const row = (item: BillingAlertEmailItem): string => {
  const details = [
    item.customerEmail,
    item.invoiceNumber ? `Invoice ${item.invoiceNumber}` : undefined,
    item.dueAt ? `Due ${item.dueAt}` : undefined,
  ]
    .filter((value): value is string => Boolean(value))
    .map(escapeHtml)
    .join(' · ');

  return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;vertical-align:top;">
        <strong>${item.severity === 'critical' ? 'ACTION REQUIRED' : 'CHECK'}</strong><br />
        ${escapeHtml(item.label)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;vertical-align:top;">
        <strong>${escapeHtml(item.customerName)}</strong>
        ${details ? `<br /><span style="color:#71717a;">${details}</span>` : ''}
      </td>
    </tr>`;
};

export const renderBillingAlertEmail = (params: {
  items: BillingAlertEmailItem[];
  adminUrl: string;
}): { subject: string; html: string } => {
  const critical = params.items.filter(
    (item) => item.severity === 'critical',
  ).length;

  return {
    subject: `Billing review: ${params.items.length.toString()} item(s), ${critical.toString()} critical`,
    html: renderEmailLayout({
      previewText: 'Manual billing items need review',
      title: 'Billing items need review',
      bodyHtml: `
        <p style="margin:0 0 16px;">These items need attention. No customer device has been blocked automatically.</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0;font-size:13px;line-height:1.5;color:#27272a;border:1px solid #e4e4e7;border-radius:8px;">
          ${params.items.slice(0, 50).map(row).join('')}
        </table>
        ${params.items.length > 50 ? '<p style="margin:12px 0 0;">More items are available in the admin Billing tab.</p>' : ''}
      `,
      ctaLabel: 'Review billing',
      ctaUrl: params.adminUrl,
      footerNote:
        'SignageWall keeps players running while manual billing is reviewed.',
    }),
  };
};
