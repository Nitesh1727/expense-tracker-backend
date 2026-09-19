import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Matches the Flutter app's AppColors (frontend/lib/core/theme/app_colors.dart)
// so the emails read as the same product, not a generic transactional template.
const COLORS = {
  primary: '#CC5F3B',
  background: '#FAF9F5',
  surface: '#FFFFFF',
  textPrimary: '#2D2A26',
  textSecondary: '#7A776D',
  border: '#E8E5DD',
};

/** Embeds the app logo as a `cid` attachment — see mailer.util.js's `sendMail`. */
function logoAttachment() {
  return { filename: 'logo.png', path: path.join(__dirname, '../assets/logo.png'), cid: 'spendwise-logo' };
}

/**
 * Every email shares this shell: logo + app name header, a card-style body,
 * and (optionally) a footer note — only the monthly report passes
 * `isReportEmail: true`, since verification/password-reset emails are
 * transactional, not recurring, and don't need one. The footer is plain
 * text pointing at in-app Settings, not a clickable unsubscribe link/button
 * — the actual one-click unsubscribe is a `List-Unsubscribe` email header
 * instead (see mailer.util.js's `sendMail`), which is what makes Gmail/
 * Outlook show their own native "Unsubscribe" affordance next to the
 * sender name, the way larger companies' mailing-list emails do — a link
 * inside the body isn't how that native chip gets triggered.
 */
function wrapEmail({ bodyHtml, isReportEmail }) {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:${COLORS.background};font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COLORS.background};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:480px;" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <img src="cid:spendwise-logo" width="56" height="56" alt="SpendWise" style="border-radius:14px;display:block;" />
              <div style="margin-top:12px;font-size:20px;font-weight:700;color:${COLORS.textPrimary};">SpendWise</div>
            </td>
          </tr>
          <tr>
            <td style="background:${COLORS.surface};border:1px solid ${COLORS.border};border-radius:16px;padding:32px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          ${
            isReportEmail
              ? `<tr>
            <td align="center" style="padding-top:20px;font-size:12px;color:${COLORS.textSecondary};line-height:1.6;">
              You're getting this because monthly reports are on for your SpendWise account.<br />
              You can turn this off any time in SpendWise's Settings.
            </td>
          </tr>`
              : ''
          }
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function codeBlockHtml(code) {
  return `<div style="text-align:center;margin:24px 0;">
    <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:8px;color:${COLORS.primary};background:${COLORS.background};border-radius:12px;padding:16px 24px;">${code}</span>
  </div>`;
}

function verificationEmailHtml({ name, code }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return wrapEmail({
    bodyHtml: `
      <div style="font-size:18px;font-weight:700;color:${COLORS.textPrimary};margin-bottom:8px;">Verify your email</div>
      <div style="font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">${greeting} enter this code in the app to verify your email address.</div>
      ${codeBlockHtml(code)}
      <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.6;">This code expires in 5 minutes. If you didn't create a SpendWise account, you can ignore this email.</div>
    `,
  });
}

function passwordResetEmailHtml({ name, code }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  return wrapEmail({
    bodyHtml: `
      <div style="font-size:18px;font-weight:700;color:${COLORS.textPrimary};margin-bottom:8px;">Reset your password</div>
      <div style="font-size:14px;color:${COLORS.textSecondary};line-height:1.6;">${greeting} use this code in the app to set a new password.</div>
      ${codeBlockHtml(code)}
      <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.6;">This code expires in 5 minutes. If you didn't request a password reset, you can ignore this email — your password hasn't changed.</div>
    `,
  });
}

/**
 * @param {{name?: string, monthLabel: string, total: string, topCategories: Array<{name: string, total: string}>}} params
 * `total`/`total` on each category are already-formatted currency strings
 * (₹ + 2 decimals), matching Formatters.currency on the frontend — the
 * email doesn't reformat numbers itself. No `unsubscribeUrl` param — the
 * actual unsubscribe mechanism is a `List-Unsubscribe` header, set by the
 * caller on `sendMail` directly (see monthlyReport.job.js), not anything
 * this template renders.
 */
function monthlyReportEmailHtml({ name, monthLabel, total, topCategories }) {
  const greeting = name ? `Hi ${name},` : 'Hi,';
  const rows = topCategories
    .map(
      (c) => `<tr>
        <td style="padding:8px 0;font-size:14px;color:${COLORS.textPrimary};border-bottom:1px solid ${COLORS.border};">${c.name}</td>
        <td align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:${COLORS.textPrimary};border-bottom:1px solid ${COLORS.border};">${c.total}</td>
      </tr>`,
    )
    .join('');

  return wrapEmail({
    isReportEmail: true,
    bodyHtml: `
      <div style="font-size:18px;font-weight:700;color:${COLORS.textPrimary};margin-bottom:4px;">Your ${monthLabel} summary</div>
      <div style="font-size:14px;color:${COLORS.textSecondary};line-height:1.6;margin-bottom:20px;">${greeting} here's what you spent last month.</div>
      <div style="text-align:center;background:${COLORS.background};border-radius:12px;padding:20px;margin-bottom:20px;">
        <div style="font-size:12px;color:${COLORS.textSecondary};text-transform:uppercase;letter-spacing:0.5px;">Total spent</div>
        <div style="font-size:32px;font-weight:700;color:${COLORS.primary};margin-top:4px;">${total}</div>
      </div>
      ${
        topCategories.length
          ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>`
          : ''
      }
      <div style="font-size:13px;color:${COLORS.textSecondary};line-height:1.6;margin-top:20px;">The full breakdown, every expense, and a by-category percentage split are in the attached spreadsheet.</div>
    `,
  });
}

export { logoAttachment, verificationEmailHtml, passwordResetEmailHtml, monthlyReportEmailHtml };
