import cron from 'node-cron';
import User from '../models/user.model.js';
import * as expenseService from '../services/expense.service.js';
import { getDateRange } from '../utils/dateRange.util.js';
import { expensesToWorkbook } from '../utils/excel.util.js';
import { sendMail } from '../utils/mailer.util.js';
import { logoAttachment, monthlyReportEmailHtml } from '../utils/emailTemplates.util.js';
import env from '../config/env.js';

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const CURRENCY_FORMAT = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * The actual per-user work — pulled out of sendMonthlyReports so it's
 * directly callable for a specific user/month (e.g. to test-send a real
 * report without waiting for the 1st of a month), rather than that being
 * reachable only via the "is today the 1st" gate below. `sendTo` defaults
 * to the user's own email; overriding it is only for that kind of test
 * send — every real send always goes to `user.email`.
 * @returns {Promise<boolean>} false if there was nothing to report (not an error).
 */
async function sendReportForUser(user, { monthLabel, start, end }, sendTo = user.email) {
  const expenses = await expenseService.findInRange(user._id.toString(), { from: start, to: end });
  if (expenses.length === 0) return false; // nothing to report — skip rather than send an empty summary

  const workbook = await expensesToWorkbook(expenses, monthLabel);
  const buffer = await workbook.xlsx.writeBuffer();

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const byCategory = new Map();
  for (const e of expenses) {
    const name = e.category?.name ?? 'Uncategorized';
    byCategory.set(name, (byCategory.get(name) ?? 0) + e.amount);
  }
  const topCategories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, amount]) => ({ name, total: CURRENCY_FORMAT.format(amount) }));

  await sendMail({
    to: sendTo,
    subject: `Your ${monthLabel} spending summary — SpendWise`,
    html: monthlyReportEmailHtml({
      name: user.name,
      monthLabel,
      total: CURRENCY_FORMAT.format(total),
      topCategories,
    }),
    attachments: [logoAttachment(), { filename: `Expenses - ${monthLabel}.xlsx`, content: buffer }],
    listUnsubscribeUrl: `${env.PUBLIC_API_URL}/api/public/unsubscribe/${user.unsubscribeToken}`,
  });
  return true;
}

/**
 * Last calendar month's {start, end, monthLabel} as of right now, in IST —
 * correct regardless of what day of the current month "now" actually is
 * (walks back to the 1st of *this* month first, then one day earlier,
 * which is guaranteed to land in the previous month; on the real cron's
 * only call time — 00:30 IST on the 1st — that's the same instant "yesterday"
 * would give, so this doesn't change the production schedule's behavior,
 * only fixes calling this directly on an arbitrary day for testing).
 */
function lastMonthRange() {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const firstOfThisMonthIst = new Date(Date.UTC(nowIst.getUTCFullYear(), nowIst.getUTCMonth(), 1));
  const lastDayOfPrevMonthUtc = new Date(firstOfThisMonthIst.getTime() - 24 * 60 * 60 * 1000 - IST_OFFSET_MS);

  const { start, end } = getDateRange('month', lastDayOfPrevMonthUtc);
  const monthLabel = `${MONTH_NAMES[new Date(start.getTime() + IST_OFFSET_MS).getUTCMonth()]} ${new Date(start.getTime() + IST_OFFSET_MS).getUTCFullYear()}`;
  return { start, end, monthLabel };
}

/** Runs once, at process startup, from a cron tick — kept separate from the schedule so it's directly testable/callable. */
async function sendMonthlyReports() {
  // "Today is the 1st" (in IST) means yesterday was the last day of last
  // month, whatever that month's actual length was (28/29/30/31) — no
  // hardcoded day-of-month math needed for Feb specifically.
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  if (nowIst.getUTCDate() !== 1) return;

  const range = lastMonthRange();

  // $ne: false (not `: true`) — a user created before this field existed
  // has no value for it at all, and should still be treated as opted in
  // (the schema default is `true` for new docs, but Mongoose doesn't
  // retroactively backfill existing ones).
  const users = await User.find({ monthlyReportEnabled: { $ne: false } });

  console.log(`[monthlyReport] Sending ${range.monthLabel} reports to up to ${users.length} users...`);
  let sent = 0;
  let failed = 0;

  for (const user of users) {
    if (!user.email) continue; // phone-only accounts have nothing to send this to

    try {
      if (await sendReportForUser(user, range)) sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`[monthlyReport] Failed for user ${user._id}:`, err.message);
    }
  }

  console.log(`[monthlyReport] Done — sent ${sent}, failed ${failed}.`);
}

/** Ticks daily at 00:30 IST; sendMonthlyReports itself no-ops on every day that isn't the 1st. */
function scheduleMonthlyReports() {
  cron.schedule('30 0 * * *', () => {
    sendMonthlyReports().catch((err) => console.error('[monthlyReport] Unhandled error:', err));
  }, { timezone: 'Asia/Kolkata' });
}

export { scheduleMonthlyReports, sendMonthlyReports, sendReportForUser, lastMonthRange };
