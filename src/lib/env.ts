import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),

  // WhatsApp Cloud API
  WHATSAPP_ACCESS_TOKEN: z.string().default(''),
  WHATSAPP_PHONE_NUMBER_ID: z.string().default(''),
  WHATSAPP_BUSINESS_ACCOUNT_ID: z.string().default(''),
  WHATSAPP_VERIFY_TOKEN: z.string().min(1),
  WHATSAPP_APP_SECRET: z.string().default(''),

  // Provider selection (.catch ensures empty string from Vercel falls back to default)
  CATALOG_PROVIDER: z.enum(['mock', 'revo']).catch('mock'),
  ORDER_PROVIDER: z.enum(['mock', 'revo']).catch('mock'),
  PAYMENT_PROVIDER: z.enum(['mock', 'revo-xpress']).catch('mock'),

  // Store
  DEFAULT_STORE_ID: z.string().default(''),

  // Business rules
  CASH_PAYMENT_MAX_AMOUNT: z.coerce.number().nonnegative().default(40), // Orders above this amount require card payment

  // Revo (future)
  REVO_API_BASE_URL: z.string().default(''),
  REVO_API_KEY: z.string().default(''),
  REVO_SOLO_LOCATION_ID: z.string().default(''),
  REVO_XPRESS_MERCHANT_ID: z.string().default(''),
  REVO_XPRESS_SECRET: z.string().default(''),

  // App
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NGROK_URL: z.string().default(''),
});

// Throws at startup if required env vars are missing
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:\n', parsed.error.flatten().fieldErrors);
  throw new Error('Invalid environment variables');
}

export const env = parsed.data;
