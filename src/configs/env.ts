
import { z } from 'zod';
import * as dotenv from 'dotenv';
dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production']).default('development'),

  DB_PORT: z.string(),
  DB_HOST: z.string(),
  DB_USER: z.string(),
  DB_PASS: z.string(),
  DB_NAME: z.string(),

  MONGO_URI: z.string(),

  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_ACCESS_TOKEN_EXPIRES: z.string().regex(/^[0-9]+[smhdwy]$/, "Must be a valid JWT duration like 1h, 15m, 7d").default('24h'), // 24 hours
  JWT_REFRESH_TOKEN_EXPIRES: z.string().regex(/^[0-9]+[smhdwy]$/, "Must be a valid JWT duration like 7d, 30d").default('30d'), // 30 days
  
  SWAGGER_PASSWORD: z.string().default('admin123'),

  // Supplier/Provider Configuration
  SUPPLIER_API_KEY: z.string(),
  SUPPLIER_SECRET_KEY: z.string(),
  SUPPLIER_GAME_LIST_URL: z.string(),
  SUPPLIER_LAUNCH_HOST: z.string(),
  SUPPLIER_CALLBACK_URL: z.string(),
  SUPPLIER_OPERATOR_ID: z.string(),
  OPERATOR_HOME_URL: z.string(),
  GGR_FILTER_PERCENT: z.string().transform(val => parseFloat(val)).default('0.5'),
  GGR_TOLERANCE: z.string().transform(val => parseFloat(val)).default('0.05'),
  PROVIDER_GGR_ENDPOINT: z.string(),
  PROVIDER_API_KEY: z.string(),

  // Rate Limiting Configuration
  RATE_LIMIT_STANDARD_MAX: z.string().transform(val => parseInt(val)).default('999999'),
  RATE_LIMIT_STANDARD_WINDOW_MS: z.string().transform(val => parseInt(val)).default('900000'),
  RATE_LIMIT_STRICT_MAX: z.string().transform(val => parseInt(val)).default('999999'),
  RATE_LIMIT_STRICT_WINDOW_MS: z.string().transform(val => parseInt(val)).default('60000'),
  RATE_LIMIT_PROVIDER_MAX: z.string().transform(val => parseInt(val)).default('999999'),
  RATE_LIMIT_PROVIDER_WINDOW_MS: z.string().transform(val => parseInt(val)).default('60000'),
  RATE_LIMIT_AUTH_MAX: z.string().transform(val => parseInt(val)).default('999999'),
  RATE_LIMIT_AUTH_WINDOW_MS: z.string().transform(val => parseInt(val)).default('900000'),
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('Invalid environment variables:', _env.error.format());
  process.exit(1);
}

export const env = _env.data;