export interface EmailTemplateParams {
  previewText: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export const renderEmailLayout = ({
  previewText,
  title,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote = 'If you did not request this email, you can safely ignore it.',
}: EmailTemplateParams): string => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#18181b;">
    <span style="display:none;max-height:0;overflow:hidden;">${previewText}</span>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f5;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e4e4e7;">
            <tr>
              <td style="padding:28px 32px 12px;">
                <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;">Edge</div>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 32px 24px;">
                <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;font-weight:700;">${title}</h1>
                <div style="font-size:15px;line-height:1.6;color:#3f3f46;">${bodyHtml}</div>
                ${
                  ctaLabel && ctaUrl
                    ? `<div style="margin-top:24px;">
                    <a href="${ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:8px;font-size:14px;font-weight:600;">${ctaLabel}</a>
                  </div>`
                    : ''
                }
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 28px;">
                <p style="margin:0;font-size:12px;line-height:1.5;color:#71717a;">${footerNote}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
