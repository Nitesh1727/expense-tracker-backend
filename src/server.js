import app from './app.js';
import connectDb from './config/db.js';
import env from './config/env.js';
import { scheduleMonthlyReports } from './jobs/monthlyReport.job.js';

async function start() {
  await connectDb();
  app.listen(env.PORT, () => console.log(`[server] listening on port ${env.PORT}`));
  scheduleMonthlyReports();
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
