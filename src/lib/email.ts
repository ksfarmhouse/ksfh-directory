import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
).replace(/\/$/, "");

const FROM = process.env.RESEND_FROM || "KSFH Alumni <onboarding@resend.dev>";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Wrap plain text typed by the admin in a branded HTML email. Paragraphs are
// split on blank lines; single newlines render as <br>.
function renderBroadcastHtml(subject: string, body: string): string {
  const paragraphs = body
    .split(/\r?\n\r?\n+/)
    .filter((p) => p.trim().length > 0)
    .map(
      (p) =>
        `<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#1a1a1a;">${escapeHtml(p).replace(/\r?\n/g, "<br>")}</p>`,
    )
    .join("");

  const bannerUrl = `${SITE_URL}/FarmHouseBanner-Full.png`;
  const directoryUrl = `${SITE_URL}/directory`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Helvetica,Arial,sans-serif;color:#1a1a1a;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f4;">
  <tr>
    <td align="center" style="padding:32px 12px;">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;border:1px solid #e4e4e4;">
        <tr>
          <td align="center" style="background:#006938;padding:28px 24px;line-height:0;font-size:0;">
            <img src="${bannerUrl}" alt="Kansas State FarmHouse" width="480" style="display:block;width:100%;max-width:480px;height:auto;border:0;outline:none;margin:0 auto;">
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:#ffce00;line-height:4px;font-size:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px 28px;background:#ffffff;">
            <h1 style="margin:0 0 16px 0;color:#006938;font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.3;">${escapeHtml(subject)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 24px 28px;background:#ffffff;">
            ${paragraphs}
          </td>
        </tr>
        <tr>
          <td style="padding:0 28px 32px 28px;background:#ffffff;">
            <a href="${directoryUrl}" style="display:inline-block;background:#006938;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 20px;border-radius:6px;">Open the Kansas State FarmHouse Directory</a>
          </td>
        </tr>
        <tr>
          <td style="background:#f4f4f4;padding:18px 28px;text-align:center;font-size:11px;color:#54575a;line-height:1.5;border-top:1px solid #e4e4e4;">
            You're receiving this because you're part of the K-State FarmHouse alumni network.<br>
            <a href="${directoryUrl}" style="color:#006938;text-decoration:underline;">${directoryUrl.replace(/^https?:\/\//, "")}</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

function renderBroadcastText(subject: string, body: string): string {
  return `${subject}\n\n${body}\n\n---\nKansas State FarmHouse alumni network\n${SITE_URL}/directory\n`;
}

export type BroadcastResult =
  | { ok: true; sent: number; failed: number; skipped: number }
  | { ok: false; error: string };

export async function sendBroadcast(args: {
  subject: string;
  body: string;
  recipients: string[];
}): Promise<BroadcastResult> {
  if (!resend) {
    return {
      ok: false,
      error: "Email is not configured: missing RESEND_API_KEY.",
    };
  }

  const subject = args.subject.trim();
  const body = args.body.trim();
  if (!subject) return { ok: false, error: "Subject is required" };
  if (!body) return { ok: false, error: "Body is required" };

  // Dedupe + lowercase + filter blanks
  const seen = new Set<string>();
  const recipients: string[] = [];
  for (const raw of args.recipients) {
    const e = raw?.trim().toLowerCase();
    if (!e || seen.has(e)) continue;
    seen.add(e);
    recipients.push(e);
  }
  if (recipients.length === 0) {
    return { ok: false, error: "No recipients to send to" };
  }

  const html = renderBroadcastHtml(subject, body);
  const text = renderBroadcastText(subject, body);

  // Resend's batch endpoint accepts up to 100 messages per call. Each entry
  // is a separate, individually addressed email (not BCC).
  const CHUNK = 100;
  let sent = 0;
  let failed = 0;
  for (let i = 0; i < recipients.length; i += CHUNK) {
    const slice = recipients.slice(i, i + CHUNK);
    const payload = slice.map((to) => ({
      from: FROM,
      to: [to],
      subject,
      html,
      text,
    }));
    const { data, error } = await resend.batch.send(payload);
    if (error) {
      console.error("[sendBroadcast] batch failed", error);
      failed += slice.length;
      continue;
    }
    const okCount = data?.data?.length ?? slice.length;
    sent += okCount;
    failed += slice.length - okCount;
  }

  return {
    ok: true,
    sent,
    failed,
    skipped: args.recipients.length - recipients.length,
  };
}
