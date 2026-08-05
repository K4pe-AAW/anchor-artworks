import crypto from "node:crypto";
import { db } from "@/lib/db";
import { notifyConfiguredChannels } from "@/lib/notify";
import { recordAuditLog } from "@/lib/audit";

const RESEND_INTERVAL_HOURS = 6;

function hashIssues(issues: string[]): string {
  return crypto.createHash("sha256").update(issues.slice().sort().join("\n")).digest("hex");
}

/**
 * 「要確認事項」を検知した際に、設定済みの通知先へ自動送信する。
 * 同じ内容を短時間に繰り返し送らないよう、直近の送信履歴と突き合わせる。
 */
export async function maybeNotifyIssues(issues: string[]): Promise<void> {
  if (issues.length === 0) return;

  const issuesHash = hashIssues(issues);
  const since = new Date(Date.now() - RESEND_INTERVAL_HOURS * 60 * 60 * 1000);
  const recent = await db.issueNotification.findFirst({
    where: { issuesHash, sentAt: { gte: since } },
  });
  if (recent) return;

  const summary = issues.map((issue) => `・${issue}`).join("\n");
  const sentChannels = await notifyConfiguredChannels(
    `【Anchor Art Works Admin】要確認事項 ${issues.length}件`,
    summary,
  );

  if (sentChannels.length === 0) return;

  await db.issueNotification.create({
    data: { issuesHash, issuesSummary: summary, channelsSent: sentChannels },
  });
  await recordAuditLog({
    administratorId: null,
    action: "notification.issues.sent",
    detail: { channels: sentChannels, issueCount: issues.length },
  });
}
