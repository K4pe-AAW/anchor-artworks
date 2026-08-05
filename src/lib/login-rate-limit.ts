import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** メールアドレス単位でログイン失敗回数を確認し、上限超過ならロックアウトする。 */
export async function isLoginLocked(email: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - env.ADMIN_LOGIN_LOCKOUT_MINUTES * 60 * 1000);
  const failedCount = await db.loginAttempt.count({
    where: { email, succeeded: false, attemptedAt: { gte: windowStart } },
  });
  return failedCount >= env.ADMIN_LOGIN_MAX_ATTEMPTS;
}

export async function recordLoginAttempt(input: {
  email: string;
  succeeded: boolean;
  ipAddress?: string | null;
  administratorId?: string | null;
}) {
  await db.loginAttempt.create({
    data: {
      email: input.email,
      succeeded: input.succeeded,
      ipAddress: input.ipAddress ?? undefined,
      administratorId: input.administratorId ?? undefined,
    },
  });
}
