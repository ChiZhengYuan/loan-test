import { z } from "zod";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const envSchema = z.object({
  DATABASE_URL: z.preprocess(
    emptyToUndefined,
    z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/loan_test?schema=public")
  ),
  APP_URL: z.preprocess(emptyToUndefined, z.string().url().default("http://localhost:3000")),
  APP_SESSION_SECRET: z.preprocess(
    emptyToUndefined,
    z.string().min(32).default("change-me-change-me-change-me-1234")
  ),
  ADMIN_SEED_EMAIL: z.preprocess(emptyToUndefined, z.string().email().optional()),
  ADMIN_SEED_PASSWORD: z.preprocess(emptyToUndefined, z.string().min(8).optional()),
  OTP_MOCK_ENABLED: z.preprocess(emptyToUndefined, z.string().default("true")),
  OTP_DEFAULT_CODE: z.preprocess(emptyToUndefined, z.string().min(6).max(6).default("123456")),
  STORAGE_DIR: z.preprocess(emptyToUndefined, z.string().default("./storage")),
  TELEGRAM_BOT_TOKEN: z.preprocess(emptyToUndefined, z.string().optional()),
  TELEGRAM_CHAT_ID: z.preprocess(emptyToUndefined, z.string().optional())
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  APP_SESSION_SECRET: process.env.APP_SESSION_SECRET,
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  OTP_MOCK_ENABLED: process.env.OTP_MOCK_ENABLED,
  OTP_DEFAULT_CODE: process.env.OTP_DEFAULT_CODE,
  STORAGE_DIR: process.env.STORAGE_DIR,
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN,
  TELEGRAM_CHAT_ID: process.env.TELEGRAM_CHAT_ID
});
