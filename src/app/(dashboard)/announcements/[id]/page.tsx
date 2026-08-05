import { notFound } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getAnnouncementDetail } from "@/server/announcements";

const CATEGORY_LABEL: Record<string, string> = {
  CRITICAL: "重要なお知らせ",
  MARKETING: "製品・マーケティング情報",
};

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcement = await getAnnouncementDetail(id);
  if (!announcement) notFound();

  return (
    <div>
      <PageHeader
        title={announcement.title}
        breadcrumb={[{ label: "お知らせ", href: "/announcements" }, { label: announcement.title }]}
        description={CATEGORY_LABEL[announcement.category]}
      />
      <div className="space-y-6 p-4 sm:p-6">
        <section className="rounded-md border border-border bg-card p-4">
          <p className="whitespace-pre-wrap text-sm">{announcement.body}</p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">配信対象</h2>
          <div className="rounded-md border border-border">
            {announcement.audiences.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">対象条件が設定されていません</p>
            ) : (
              announcement.audiences.map((audience) => (
                <div key={audience.id} className="border-b border-border px-3 py-2 text-sm last:border-b-0">
                  {audience.targetAllUsers
                    ? "全利用者"
                    : `${audience.service?.name ?? "全サービス"} / プラン: ${audience.planFilter ?? "指定なし"}`}
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">配信結果</h2>
          <div className="rounded-md border border-border">
            {announcement.deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
              >
                <span>{delivery.channel === "EMAIL" ? "メール" : "サービス内"}</span>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>対象 {formatNumber(delivery.targetCount)}</span>
                  <span>成功 {formatNumber(delivery.successCount)}</span>
                  <span>失敗 {formatNumber(delivery.failureCount)}</span>
                  <span>開封 {formatNumber(delivery.openCount)}</span>
                  <StatusBadge
                    label={delivery.status}
                    tone={delivery.status === "COMPLETED" ? "success" : delivery.status === "FAILED" ? "danger" : "neutral"}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          配信日時: {formatDateTime(announcement.sentAt ?? announcement.scheduledAt)}
        </p>
      </div>
    </div>
  );
}
