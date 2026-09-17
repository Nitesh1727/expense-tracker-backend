import app from './app.js';
import connectDb from './config/db.js';
import env from './config/env.js';

async function start() {
  await connectDb();
  app.listen(env.PORT, () => console.log(`[server] listening on port ${env.PORT}`));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
