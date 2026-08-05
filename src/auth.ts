import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { authConfig } from "@/lib/auth.config";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { decryptTotpSecret, verifyTotpCode } from "@/lib/totp";
import { isLoginLocked, recordLoginAttempt } from "@/lib/login-rate-limit";
import { recordAuditLog } from "@/lib/audit";
import { env } from "@/lib/env";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  totpCode: z.string().min(6).max(6),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  providers: [
    Credentials({
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
        totpCode: { label: "認証コード", type: "text" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) {
          return null;
        }
        const { email, password, totpCode } = parsed.data;
        const ipAddress =
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

        // 許可リスト（administratorsテーブル）に存在し、かつ有効なアカウントのみ。
        const administrator = await db.administrator.findUnique({ where: { email } });

        if (await isLoginLocked(email)) {
          await recordAuditLog({
            administratorId: administrator?.id ?? null,
            action: "auth.login.locked_out",
            ipAddress,
          });
          return null;
        }

        if (!administrator || !administrator.isActive) {
          await recordLoginAttempt({ email, succeeded: false, ipAddress });
          return null;
        }

        const passwordOk = await verifyPassword(password, administrator.passwordHash);
        if (!passwordOk) {
          await recordLoginAttempt({
            email,
            succeeded: false,
            ipAddress,
            administratorId: administrator.id,
          });
          return null;
        }

        // MFA未設定のアカウントではログインを許可しない（起動要件と同様、必須とする）。
        if (!administrator.mfaEnabledAt || !administrator.totpSecretEncrypted) {
          await recordLoginAttempt({
            email,
            succeeded: false,
            ipAddress,
            administratorId: administrator.id,
          });
          await recordAuditLog({
            administratorId: administrator.id,
            action: "auth.login.mfa_not_configured",
            ipAddress,
          });
          return null;
        }

        const secret = decryptTotpSecret(administrator.totpSecretEncrypted);
        const totpOk = verifyTotpCode(secret, totpCode);
        if (!totpOk) {
          await recordLoginAttempt({
            email,
            succeeded: false,
            ipAddress,
            administratorId: administrator.id,
          });
          return null;
        }

        await recordLoginAttempt({
          email,
          succeeded: true,
          ipAddress,
          administratorId: administrator.id,
        });
        await db.administrator.update({
          where: { id: administrator.id },
          data: { lastLoginAt: new Date() },
        });
        await db.adminSession.create({
          data: {
            administratorId: administrator.id,
            expiresAt: new Date(Date.now() + env.ADMIN_SESSION_MAX_AGE_HOURS * 60 * 60 * 1000),
            ipAddress,
            userAgent: request.headers.get("user-agent") ?? undefined,
          },
        });
        await recordAuditLog({
          administratorId: administrator.id,
          action: "auth.login.success",
          ipAddress,
        });

        return {
          id: administrator.id,
          email: administrator.email,
          name: administrator.displayName,
          role: administrator.role,
        };
      },
    }),
  ],
});
