import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

interface RecordAuditLogInput {
  administratorId: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  detail?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

/**
 * 監査ログは追記専用（INSERTのみ）。DB側でもUPDATE/DELETE権限を剥奪し、
 * アプリコードからも更新・削除用の関数は用意しない。
 */
export async function recordAuditLog(input: RecordAuditLogInput) {
  await db.adminAuditLog.create({
    data: {
      administratorId: input.administratorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      detail: input.detail,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}
