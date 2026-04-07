import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://postgres:postgres@localhost:5432/loan_test?schema=public"),
  APP_URL: z.string().url().optional().default("http://localhost:3000"),
  APP_SESSION_SECRET: z.string().min(32).default("change-me-change-me-change-me-1234"),
  ADMIN_SEED_EMAIL: z.string().email().optional(),
  ADMIN_SEED_PASSWORD: z.string().min(8).optional(),
  OTP_MOCK_ENABLED: z.string().optional().default("true"),
  OTP_DEFAULT_CODE: z.string().min(6).max(6).optional().default("123456"),
  STORAGE_DIR: z.string().optional().default("./storage")
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  APP_SESSION_SECRET: process.env.APP_SESSION_SECRET,
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD,
  OTP_MOCK_ENABLED: process.env.OTP_MOCK_ENABLED,
  OTP_DEFAULT_CODE: process.env.OTP_DEFAULT_CODE,
  STORAGE_DIR: process.env.STORAGE_DIR
});
