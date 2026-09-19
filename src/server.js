import app from './app.js';
import connectDb from './config/db.js';
import env from './config/env.js';
import { scheduleMonthlyReports } from './jobs/monthlyReport.job.js';
import { seedDemoAccountIfMissing } from './jobs/seedDemoAccount.job.js';

async function start() {
  await connectDb();

  // Idempotent (checks first, no-ops if it already exists) — safe to run on
  // every boot, not just "the first one", so a fresh database (a brand new
  // Atlas cluster, for instance) gets the demo account without needing a
  // one-off manual step. Best-effort: a failure here shouldn't stop real
  // users from being served.
  try {
    await seedDemoAccountIfMissing();
  } catch (err) {
    console.error('[server] Demo account seed failed:', err);
  }

  app.listen(env.PORT, () => console.log(`[server] listening on port ${env.PORT}`));
  scheduleMonthlyReports();
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
