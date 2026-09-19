/**
 * Loads and validates environment variables once, at startup.
 * Every other file reads config from here instead of `process.env` directly —
 * keeps missing/malformed env vars a single, loud, early failure instead of
 * an undefined popping up somewhere deep in a service.
 */
import { z } from 'zod';
import 'dotenv/config';

const schema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('30d'),
  SMS_PROVIDER: z.enum(['dev']).default('dev'),
  // Both optional at startup — mailer.util.js throws a clear error only
  // when something actually tries to send an email without these set,
  // rather than blocking the whole server from booting over a feature that
  // isn't configured yet.
  SMTP_USER: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),
  // The unsubscribe link in the monthly report email is a plain GET link
  // opened from the recipient's own device, so it needs the backend's real
  // publicly-reachable address, not localhost — defaults to localhost for
  // local dev (where the link just won't be clickable from anywhere but
  // this machine, which is fine pre-deployment); set to the real deployed
  // URL once this backend is hosted somewhere.
  PUBLIC_API_URL: z.string().default('http://localhost:4000'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export default parsed.data;
