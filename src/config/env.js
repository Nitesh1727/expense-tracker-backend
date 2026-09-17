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
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export default parsed.data;
