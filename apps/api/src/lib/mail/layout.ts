import { lightColors as c } from "@padel/shared/theme";

export type EmailContent = {
  /** Short inbox preview line shown after the subject. */
  preheader: string;
  heading: string;
  /** Body paragraphs, rendered in order. */
  paragraphs: string[];
  cta: { label: string; url: string };
  /** Small print under the button, e.g. expiry. */
  note?: string;
  /** Why the recipient got this email and what to do if unexpected. */
  footer: string;
};

export type RenderedEmail = { html: string; text: string };

const BRAND = "Casual Padel";
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:${c.text};">${escapeHtml(text)}</p>`;
}

function button(label: string, url: string): string {
  const href = escapeHtml(url);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
<tr><td style="border-radius:10px;background:${c.primary};">
<a href="${href}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;color:${c.onPrimary};text-decoration:none;border-radius:10px;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function fallbackLink(url: string): string {
  const safe = escapeHtml(url);
  return `<p style="margin:0 0 6px;font-size:13px;line-height:20px;color:${c.muted};">Button not working? Copy and paste this link into your browser:</p>
<p style="margin:0;font-size:13px;line-height:20px;word-break:break-all;"><a href="${safe}" style="color:${c.statusLive};">${safe}</a></p>`;
}

export function renderEmailHtml(content: EmailContent): string {
  const note = content.note
    ? `<p style="margin:0 0 24px;font-size:13px;line-height:20px;color:${c.muted};">${escapeHtml(content.note)}</p>`
    : "";
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:${c.surfaceAlt};font-family:${FONT};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(content.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.surfaceAlt};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font-size:17px;font-weight:800;letter-spacing:-0.2px;color:${c.text};">
<span style="display:inline-block;width:10px;height:10px;border-radius:5px;background:${c.primary};margin-right:8px;"></span>${BRAND}
</td></tr>
<tr><td style="background:${c.surface};border:1px solid #e2e8f0;border-radius:16px;padding:32px;">
<h1 style="margin:0 0 16px;font-size:22px;line-height:30px;font-weight:700;color:${c.text};">${escapeHtml(content.heading)}</h1>
${content.paragraphs.map(paragraph).join("\n")}
${button(content.cta.label, content.cta.url)}
${note}
<div style="border-top:1px solid #e2e8f0;padding-top:20px;">${fallbackLink(content.cta.url)}</div>
</td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:18px;color:${c.muted};">${escapeHtml(content.footer)}<br>&copy; ${BRAND}</td></tr>
</table></td></tr></table></body></html>`;
}

export function renderEmailText(content: EmailContent): string {
  return [
    content.heading,
    "",
    ...content.paragraphs.flatMap((text) => [text, ""]),
    `${content.cta.label}:`,
    content.cta.url,
    "",
    ...(content.note ? [content.note, ""] : []),
    "—",
    content.footer,
    BRAND,
    ""
  ].join("\n");
}

export function renderEmail(content: EmailContent): RenderedEmail {
  return { html: renderEmailHtml(content), text: renderEmailText(content) };
}
