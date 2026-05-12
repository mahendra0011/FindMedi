const BRAND = {
  name: 'MediCore Hospital',
  primary: '#25998f',
  primaryDark: '#176b64',
  navy: '#142433',
  slate: '#526172',
  border: '#dbe8ea',
  panel: '#f6fbfb',
  white: '#ffffff',
  success: '#15935f',
  warning: '#c77700',
  danger: '#c2413f',
};

const toneColor = {
  default: BRAND.primary,
  success: BRAND.success,
  warning: BRAND.warning,
  danger: BRAND.danger,
  info: '#2f7fcc',
};

export const escapeHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const asArray = (value) => Array.isArray(value) ? value : [value].filter(Boolean);

const renderParagraphs = (paragraphs = []) => asArray(paragraphs)
  .map(paragraph => `
    <p style="margin:0 0 14px;color:${BRAND.slate};font-size:15px;line-height:1.7;">
      ${escapeHtml(paragraph)}
    </p>
  `)
  .join('');

const renderDetails = (details = []) => {
  const rows = details.filter(item => item?.label && item?.value !== undefined && item?.value !== null && item?.value !== '');
  if (!rows.length) return '';

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;margin:22px 0;background:${BRAND.panel};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
      ${rows.map((item, index) => `
        <tr>
          <td style="padding:13px 16px;width:38%;border-bottom:${index === rows.length - 1 ? '0' : `1px solid ${BRAND.border}`};color:${BRAND.slate};font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;">
            ${escapeHtml(item.label)}
          </td>
          <td style="padding:13px 16px;border-bottom:${index === rows.length - 1 ? '0' : `1px solid ${BRAND.border}`};color:${BRAND.navy};font-size:14px;font-weight:700;">
            ${escapeHtml(item.value)}
          </td>
        </tr>
      `).join('')}
    </table>
  `;
};

const renderCode = (code) => {
  if (!code) return '';
  return `
    <div style="margin:24px 0 20px;padding:22px 18px;border-radius:16px;background:linear-gradient(135deg,rgba(37,153,143,.12),rgba(47,127,204,.10));border:1px solid rgba(37,153,143,.28);text-align:center;">
      <div style="color:${BRAND.slate};font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;margin-bottom:10px;">Verification Code</div>
      <div style="font-family:'Courier New',monospace;color:${BRAND.navy};font-size:34px;line-height:1;font-weight:800;letter-spacing:9px;">
        ${escapeHtml(code)}
      </div>
    </div>
  `;
};

const renderCta = (cta) => {
  if (!cta?.label || !cta?.url) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0;">
      <tr>
        <td style="border-radius:12px;background:${BRAND.primary};box-shadow:0 12px 26px rgba(37,153,143,.24);">
          <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:13px 18px;color:${BRAND.white};font-size:14px;font-weight:800;text-decoration:none;border-radius:12px;">
            ${escapeHtml(cta.label)}
          </a>
        </td>
      </tr>
    </table>
  `;
};

export const renderEmailTemplate = ({
  title,
  subtitle = '',
  badge = 'MediCore Update',
  greeting = '',
  paragraphs = [],
  details = [],
  code = '',
  cta,
  note = '',
  tone = 'default',
  preheader = '',
}) => {
  const accent = toneColor[tone] || toneColor.default;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background:#edf6f7;font-family:Inter,Segoe UI,Arial,sans-serif;color:${BRAND.navy};">
    ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>` : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#edf6f7;">
      <tr>
        <td align="center" style="padding:32px 14px;">
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:640px;border-collapse:separate;border-spacing:0;">
            <tr>
              <td style="padding:0 0 14px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="vertical-align:middle;">
                      <div style="display:inline-block;width:42px;height:42px;border-radius:13px;background:${BRAND.primary};vertical-align:middle;text-align:center;line-height:42px;color:#fff;font-weight:900;font-size:20px;">M</div>
                      <span style="display:inline-block;margin-left:10px;vertical-align:middle;color:${BRAND.navy};font-size:20px;font-weight:900;letter-spacing:-.02em;">MediCore</span>
                    </td>
                    <td align="right" style="vertical-align:middle;color:${BRAND.slate};font-size:12px;font-weight:700;">
                      Hospital Management System
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="background:${BRAND.white};border:1px solid ${BRAND.border};border-radius:22px;overflow:hidden;box-shadow:0 22px 60px rgba(20,36,51,.10);">
                <div style="height:7px;background:linear-gradient(90deg,${BRAND.primary},#2f7fcc,#7c6ee6);"></div>
                <div style="padding:30px 30px 26px;">
                  <div style="display:inline-block;padding:7px 11px;border-radius:999px;background:#eefafa;color:${accent};font-size:12px;font-weight:900;letter-spacing:.04em;text-transform:uppercase;">
                    ${escapeHtml(badge)}
                  </div>
                  <h1 style="margin:18px 0 8px;color:${BRAND.navy};font-size:28px;line-height:1.2;font-weight:900;letter-spacing:-.03em;">
                    ${escapeHtml(title)}
                  </h1>
                  ${subtitle ? `<p style="margin:0 0 22px;color:${BRAND.slate};font-size:16px;line-height:1.6;">${escapeHtml(subtitle)}</p>` : ''}
                  ${greeting ? `<p style="margin:0 0 14px;color:${BRAND.navy};font-size:15px;line-height:1.7;font-weight:800;">${escapeHtml(greeting)}</p>` : ''}
                  ${renderParagraphs(paragraphs)}
                  ${renderCode(code)}
                  ${renderDetails(details)}
                  ${renderCta(cta)}
                  ${note ? `
                    <div style="margin-top:22px;padding:14px 16px;border-radius:14px;background:${BRAND.panel};border:1px solid ${BRAND.border};color:${BRAND.slate};font-size:13px;line-height:1.6;">
                      ${escapeHtml(note)}
                    </div>
                  ` : ''}
                </div>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding:18px 18px 0;color:#708090;font-size:12px;line-height:1.6;">
                <strong style="color:${BRAND.navy};">MediCore Hospital</strong><br>
                Secure care, digital records, and connected hospital workflows.<br>
                This is an automated message. Please do not reply to this email.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

export const renderPlainText = ({
  title,
  greeting = '',
  paragraphs = [],
  details = [],
  code = '',
  cta,
  note = '',
}) => [
  title,
  greeting,
  ...asArray(paragraphs),
  code ? `Verification code: ${code}` : '',
  ...details
    .filter(item => item?.label && item?.value !== undefined && item?.value !== null && item?.value !== '')
    .map(item => `${item.label}: ${item.value}`),
  cta?.url ? `${cta.label || 'Open MediCore'}: ${cta.url}` : '',
  note,
  'MediCore Hospital',
].filter(Boolean).join('\n\n');
