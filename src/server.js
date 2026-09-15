const app = require('./app');
const connectDb = require('./config/db');
const env = require('./config/env');

async function start() {
  await connectDb();
  app.listen(env.PORT, () => console.log(`[server] listening on port ${env.PORT}`));
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
