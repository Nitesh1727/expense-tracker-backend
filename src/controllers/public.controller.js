import * as authService from '../services/auth.service.js';

/**
 * A plain HTML page, not JSON — this is opened directly in a browser from
 * an emailed link, not called by the app. Minimal inline styling, same
 * brand color as the email templates, no dependency on any app asset since
 * it needs to render standalone.
 */
function confirmationPage() {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>SpendWise</title></head>
<body style="margin:0;padding:0;background:#FAF9F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="max-width:420px;margin:64px auto;padding:32px 28px;background:#FFFFFF;border:1px solid #E8E5DD;border-radius:16px;text-align:center;">
    <div style="font-size:20px;font-weight:700;color:#2D2A26;margin-bottom:8px;">You're unsubscribed</div>
    <div style="font-size:14px;color:#7A776D;line-height:1.6;">You won't get the monthly spending report email anymore. You can turn it back on any time from Settings in the app.</div>
  </div>
</body>
</html>`;
}

/** GET — a person clicking the link directly in a browser; shows a human-readable confirmation. */
async function unsubscribe(req, res) {
  await authService.unsubscribeFromReports(req.params.token);
  res.status(200).set('Content-Type', 'text/html').send(confirmationPage());
}

/**
 * POST — Gmail/Outlook's own one-click "Unsubscribe" button (RFC 8058: a
 * `List-Unsubscribe-Post` header tells the mail client to POST here itself,
 * with no page for anyone to see) rather than opening the link in a
 * browser. No content needed back, just success.
 */
async function unsubscribeOneClick(req, res) {
  await authService.unsubscribeFromReports(req.params.token);
  res.status(200).end();
}

export { unsubscribe, unsubscribeOneClick };
