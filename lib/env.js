import { z } from 'zod';

const schema = z.object({
  // ── Required ─────────────────────────────────────────────────────────────
  DATABASE_URL:    z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(1, 'NEXTAUTH_SECRET is required'),
  NEXTAUTH_URL:    z.string().url('NEXTAUTH_URL must be a valid URL'),

  // ── Mail provider selection ───────────────────────────────────────────────
  // 'gmail' / 'google' → Gmail SMTP   |   'graph' / 'ms' → MS Graph
  // Can also be set from the Settings panel; ENV is the fallback.
  MAIL_PROVIDER: z
    .enum(['gmail', 'google', 'graph', 'ms'])
    .optional()
    .default('gmail'),

  // ── MS Graph (required when MAIL_PROVIDER = graph / ms) ──────────────────
  MS_TENANT_ID:    z.string().optional(),
  MS_CLIENT_ID:    z.string().optional(),
  MS_CLIENT_SECRET: z.string().optional(),
  MS_FROM_EMAIL:   z.string().email().optional().or(z.literal('')),

  // ── Gmail SMTP (required when MAIL_PROVIDER = gmail / google) ────────────
  GMAIL_USER:         z.string().email().optional().or(z.literal('')),
  GMAIL_APP_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2));
  throw new Error('Invalid environment variables — check .env.local');
}

export const env = parsed.data;
