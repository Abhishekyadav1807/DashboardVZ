import { z } from 'zod';

/**
 * All configuration is read once at startup and validated with Zod.
 * The application will crash immediately with a descriptive error rather
 * than failing silently on a missing variable at runtime.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().url('DATABASE_URL must be a valid connection string'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_EXPIRES_IN: z.string().default('15m'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),
  PORT: z
    .string()
    .default('4000')
    .transform((v) => parseInt(v, 10)),
  CLIENT_URL: z.string().url('CLIENT_URL must be a valid URL'),
  COOKIE_SECURE: z
    .string()
    .default('false')
    .transform((v) => v === 'true'),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌  Invalid environment variables:\n');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')} — ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;

/**
 * Refresh-token cookie options.
 * Cross-site production (Vercel frontend + Render backend) requires
 * SameSite=None with Secure=true so the browser sends the HttpOnly cookie.
 */
export const refreshCookieOptions = {
  httpOnly: true as const,
  secure: env.COOKIE_SECURE,
  sameSite: (env.COOKIE_SECURE ? 'none' : 'lax') as 'none' | 'lax',
  path: '/api/v1/auth/refresh',
};
