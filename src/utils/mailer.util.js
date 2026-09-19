import nodemailer from 'nodemailer';
import ApiError from './ApiError.js';
import env from '../config/env.js';

const FROM_NAME = 'SpendWise';

let transporter;

/**
 * Built lazily (not at module load) so a server without SMTP_USER/
 * SMTP_APP_PASSWORD set yet can still boot and serve every other route —
 * only a route that actually tries to send an email hits this and fails
 * loudly, rather than the whole process refusing to start over a feature
 * that isn't configured yet.
 */
function getTransporter() {
  if (transporter) return transporter;

  if (!env.SMTP_USER || !env.SMTP_APP_PASSWORD) {
    throw new ApiError(
      500,
      'Email is not configured — set SMTP_USER and SMTP_APP_PASSWORD in backend/.env (a Gmail address and an App Password from https://myaccount.google.com/apppasswords).',
    );
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: env.SMTP_USER, pass: env.SMTP_APP_PASSWORD },
  });
  return transporter;
}

/**
 * @param {{to: string, subject: string, html: string, attachments?: Array, listUnsubscribeUrl?: string}} params
 * `attachments` follows nodemailer's own shape — used both for the monthly
 * report's `.xlsx` and for inline-embedding the logo via `cid` in every
 * template (see emailTemplates.util.js's `logoAttachment`).
 *
 * `listUnsubscribeUrl`, when given, sets the `List-Unsubscribe` /
 * `List-Unsubscribe-Post` headers (RFC 8058) — this is what makes Gmail
 * (and most other clients) show their own native "Unsubscribe" chip next
 * to the sender name, the way it shows up on mailing-list emails from
 * larger companies. That's a *header*, invisible in the rendered email
 * body — it's separate from, and doesn't require, any unsubscribe link
 * inside the HTML itself.
 */
async function sendMail({ to, subject, html, attachments, listUnsubscribeUrl }) {
  await getTransporter().sendMail({
    from: `"${FROM_NAME}" <${env.SMTP_USER}>`,
    to,
    subject,
    html,
    attachments,
    ...(listUnsubscribeUrl
      ? {
          headers: {
            'List-Unsubscribe': `<${listUnsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        }
      : {}),
  });
}

export { sendMail };
