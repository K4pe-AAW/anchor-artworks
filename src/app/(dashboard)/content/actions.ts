"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { addContentSnapshot } from "@/server/content";
import { recordAuditLog } from "@/lib/audit";

const schema = z.object({
  channelId: z.string().min(1),
  followers: z.coerce.number().int().nonnegative().optional(),
  periodViews: z.coerce.number().int().nonnegative().optional(),
  periodLikes: z.coerce.number().int().nonnegative().optional(),
  note: z.string().max(500).optional(),
});

export interface RecordSnapshotState {
  ok: boolean;
  error?: string;
}

/**
 * 各プラットフォームのダッシュボードで確認した数値を手動で記録する。
 * API連携は行わず、認証情報も一切保存しない。
 */
export async function recordContentSnapshot(
  _prevState: RecordSnapshotState,
  formData: FormData,
): Promise<RecordSnapshotState> {
  const session = await auth();
  if (!session?.user || session.expired) {
    return { ok: false, error: "認証が必要です" };
  }

  const parsed = schema.safeParse({
    channelId: formData.get("channelId"),
    followers: formData.get("followers") || undefined,
    periodViews: formData.get("periodViews") || undefined,
    periodLikes: formData.get("periodLikes") || undefined,
    note: formData.get("note") || undefined,
  });

  if (!parsed.success) {
    return { ok: false, error: "入力内容を確認してください" };
  }

  await addContentSnapshot({
    ...parsed.data,
    recordedById: session.user.id,
  });

  await recordAuditLog({
    administratorId: session.user.id,
    action: "content.snapshot.recorded",
    targetType: "content_channel",
    targetId: parsed.data.channelId,
    detail: {
      followers: parsed.data.followers,
      periodViews: parsed.data.periodViews,
      periodLikes: parsed.data.periodLikes,
    },
  });

  revalidatePath("/content");
  return { ok: true };
}
