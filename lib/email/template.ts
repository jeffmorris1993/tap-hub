import "server-only";

const SITE_URL_FALLBACK = "https://tap-hub-theta.vercel.app";

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK;
}

export function escapeHtml(s: string | null | undefined): string {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type Field = { label: string; value: string | null | undefined };

function fieldsHtml(fields: Field[]): string {
  return fields
    .filter((f) => f.value != null && String(f.value).trim() !== "")
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 0 4px;">
          <div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#9aa3b8;">${escapeHtml(f.label)}</div>
          <div style="margin-top:4px;font-size:14.5px;font-weight:600;color:#f4f1ea;line-height:1.45;">${escapeHtml(f.value)}</div>
        </td>
      </tr>`,
    )
    .join("");
}

export type Notice =
  | { variant: "info"; text: string }
  | { variant: "highlight"; text: string };

function noticeHtml(notice: Notice): string {
  const bg = notice.variant === "highlight" ? "rgba(231,184,78,.10)" : "rgba(78,141,231,.10)";
  const border =
    notice.variant === "highlight" ? "rgba(231,184,78,.32)" : "rgba(78,141,231,.30)";
  const color = notice.variant === "highlight" ? "#e7b84e" : "#9bbcf2";
  return `
  <tr>
    <td style="padding:18px 0 0;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${bg};border:1px solid ${border};border-radius:11px;">
        <tr>
          <td style="padding:12px 14px;font-size:13px;line-height:1.5;color:${color};font-weight:600;">${escapeHtml(notice.text)}</td>
        </tr>
      </table>
    </td>
  </tr>`;
}

export type BrandedEmailInput = {
  /** Short uppercase line in gold above the headline. */
  eyebrow: string;
  /** Big Anton-style display headline. */
  headline: string;
  /** Optional intro paragraph below the headline. */
  intro?: string;
  /** Optional notice card (e.g. confidentiality reminder). */
  notice?: Notice;
  /** Definition-list of name/value rows. Empty values are filtered out. */
  fields?: Field[];
  /** Optional body block (e.g. a prayer request) shown in a quoted style. */
  body?: { label: string; content: string };
  /** Primary CTA. */
  cta?: { label: string; href: string };
  /** Footer paragraph (small / dim). */
  footnote?: string;
};

export function renderBrandedEmail(input: BrandedEmailInput): string {
  const eyebrow = escapeHtml(input.eyebrow);
  const headline = escapeHtml(input.headline);
  const intro = input.intro
    ? `<tr><td style="padding:14px 0 0;font-size:14.5px;line-height:1.6;color:#cdd3e0;">${escapeHtml(input.intro)}</td></tr>`
    : "";
  const notice = input.notice ? noticeHtml(input.notice) : "";
  const fields = input.fields && input.fields.length
    ? `<tr><td style="padding:20px 0 0;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">${fieldsHtml(input.fields)}</table></td></tr>`
    : "";
  const body = input.body
    ? `
    <tr>
      <td style="padding:24px 0 0;">
        <div style="font-size:10.5px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#9aa3b8;margin-bottom:8px;">${escapeHtml(input.body.label)}</div>
        <div style="background:#070b14;border:1px solid rgba(244,241,234,.06);border-left:3px solid #e7b84e;border-radius:10px;padding:16px 18px;font-size:14.5px;line-height:1.6;color:#f4f1ea;white-space:pre-wrap;">${escapeHtml(input.body.content)}</div>
      </td>
    </tr>`
    : "";
  const cta = input.cta
    ? `
    <tr>
      <td align="left" style="padding:28px 0 4px;">
        <a href="${input.cta.href}" style="display:inline-block;background:#e7b84e;color:#0b101c;text-decoration:none;font-weight:800;font-size:13px;letter-spacing:.06em;text-transform:uppercase;padding:13px 22px;border-radius:11px;">${escapeHtml(input.cta.label)}</a>
      </td>
    </tr>`
    : "";
  const footer = input.footnote
    ? `<tr><td style="padding:0 0 4px;"><p style="margin:0;font-size:12px;line-height:1.6;color:#6a738b;">${escapeHtml(input.footnote)}</p></td></tr>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${eyebrow}</title>
</head>
<body style="margin:0;padding:0;background:#070b14;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#f4f1ea;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#070b14;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:#0b101c;border:1px solid rgba(244,241,234,.08);border-radius:20px;">
          <tr>
            <td style="padding:34px 36px 8px;">
              <div style="font-size:10px;font-weight:800;letter-spacing:.28em;text-transform:uppercase;color:#e7b84e;">${eyebrow}</div>
              <h1 style="margin:10px 0 0;font-size:28px;font-weight:900;letter-spacing:.005em;line-height:1.05;text-transform:uppercase;color:#f4f1ea;">${headline}</h1>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${intro}
                ${notice}
                ${fields}
                ${body}
                ${cta}
              </table>
            </td>
          </tr>
          <tr><td style="padding:24px 36px 0;"><hr style="border:none;border-top:1px solid rgba(244,241,234,.08);margin:0;"></td></tr>
          <tr>
            <td style="padding:18px 36px 30px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${footer}
                <tr><td style="padding:8px 0 0;"><p style="margin:0;font-size:11px;font-weight:700;letter-spacing:.04em;color:#6a738b;">Nehemiah&apos;s Temple Apostolic Church &middot; Madison Heights, MI &middot; via TapHub</p></td></tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
