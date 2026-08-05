import { z } from "zod";

/**
 * 起動時に必須の環境変数を検証する。
 * 認証・セキュリティに関わる設定が不足している場合はアプリを起動させない
 * （「必要な認証設定が不足している場合は、管理画面を起動可能な状態にしない」という要件のため）。
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URLが未設定です"),
  AUTH_SECRET: z
    .string()
    .min(32, "AUTH_SECRETは32文字以上のランダム値を設定してください（openssl rand -base64 32）"),
  ADMIN_TOTP_ENCRYPTION_KEY: z
    .string()
    .min(32, "ADMIN_TOTP_ENCRYPTION_KEYはbase64の32バイト鍵を設定してください（openssl rand -base64 32）"),
  ADMIN_SESSION_MAX_AGE_HOURS: z.coerce.number().positive().default(4),
  ADMIN_IDLE_TIMEOUT_MINUTES: z.coerce.number().positive().default(20),
  ADMIN_LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ADMIN_LOGIN_LOCKOUT_MINUTES: z.coerce.number().positive().default(15),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(
      `認証・セキュリティに必要な環境変数が不足しています。管理画面を起動できません。\n${issues}\n` +
        `.env.example を参考に .env を設定してください。`,
    );
  }
  return parsed.data;
}

export const env = loadEnv();
