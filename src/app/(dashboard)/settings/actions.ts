"use server";

import { auth } from "@/auth";
import { notifyConfiguredChannels } from "@/lib/notify";
import { recordAuditLog } from "@/lib/audit";

export interface TestNotificationState {
  status: "idle" | "sent" | "no_channels" | "unauthorized";
  channels?: string[];
}

// useActionStateの規約上、未使用でも第1引数（前回の状態）を受け取る必要がある。
export async function sendTestNotification(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: TestNotificationState,
): Promise<TestNotificationState> {
  const session = await auth();
  if (!session?.user || session.expired) {
    return { status: "unauthorized" };
  }

  const sent = await notifyConfiguredChannels(
    "【Anchor Art Works Admin】テスト通知",
    `${session.user.name ?? session.user.email}さんがテスト通知を送信しました。`,
  );

  await recordAuditLog({
    administratorId: session.user.id,
    action: "notification.test.sent",
    detail: { channels: sent },
  });

  return sent.length > 0 ? { status: "sent", channels: sent } : { status: "no_channels" };
}
