import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/filter-bar";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, healthTone } from "@/components/status-badge";
import { SyncStatus } from "@/components/state/sync-status";
import { RevenueTrendChart } from "@/components/revenue-trend-chart-loader";
import { formatDate, formatJPY, formatNumber } from "@/lib/format";
import { parseFilters } from "@/lib/filters";
import { getOverviewData, getRevenueTrend, getServiceOptions } from "@/server/overview";
import { getStaleContentChannels } from "@/server/content";
import { maybeNotifyIssues } from "@/server/notifications";

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseFilters(await searchParams);
  const [data, services, revenueTrend, staleContentChannels] = await Promise.all([
    getOverviewData(filters),
    getServiceOptions(),
    getRevenueTrend(filters),
    getStaleContentChannels(),
  ]);

  const issues: string[] = [];
  if (data.webhooks.stripe && data.webhooks.stripe.failureCount > 0) {
    issues.push(`Stripe Webhookの失敗が${data.webhooks.stripe.failureCount}件あります`);
  }
  if (data.webhooks.paypal && data.webhooks.paypal.failureCount > 0) {
    issues.push(`PayPal Webhookの失敗が${data.webhooks.paypal.failureCount}件あります`);
  }
  if (data.jobs.failure > 0) {
    issues.push(`過去7日間でジョブの失敗が${data.jobs.failure}件あります`);
  }
  if (data.serviceDegraded.length > 0) {
    issues.push(
      `稼働状態が正常でないサービスがあります: ${data.serviceDegraded.map((s) => s.name).join("、")}`,
    );
  }
  if (data.sync.hasError) {
    issues.push("売上データの同期エラーがあります。数値は参考値である可能性があります");
  }
  for (const channel of staleContentChannels) {
    issues.push(
      channel.lastRecordedAt
        ? `${channel.name}の数値が${formatDate(channel.lastRecordedAt)}以降更新されていません`
        : `${channel.name}の数値がまだ記録されていません`,
    );
  }

  // 絞り込みなし（既定の全体表示）を見ているときだけ通知する。
  // フィルタ次第で異常一覧が変わるため、フィルタ済みの内容を通知の基準にはしない。
  const isDefaultView = !filters.serviceId && !filters.provider && !filters.plan;
  if (isDefaultView) {
    await maybeNotifyIssues(issues);
  }

  const netRevenueDelta =
    data.kpi.previousNetRevenue > 0
      ? Math.round(
          ((data.kpi.netRevenue - data.kpi.previousNetRevenue) / data.kpi.previousNetRevenue) * 100,
        )
      : null;

  return (
    <div>
      <PageHeader
        title="概要"
        description="今日確認すべき数値と異常をまとめて表示します"
      />
      <FilterBar services={services} />

      <div className="space-y-6 p-4 sm:p-6">
        {issues.length > 0 ? (
          <div className="rounded-md border border-danger/30 bg-danger/5 p-3">
            <div className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-danger">
              <AlertTriangle className="size-4" />
              要確認事項 {issues.length}件
            </div>
            <ul className="ml-5 list-disc space-y-0.5 text-sm text-foreground/80">
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success">
            <CheckCircle2 className="size-4" />
            現在、要確認の異常はありません
          </div>
        )}

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">売上・契約</h2>
            <SyncStatus lastSyncedAt={data.sync.lastSyncedAt} />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="当月総売上" value={formatJPY(data.kpi.grossRevenue)} />
            <StatCard label="決済手数料" value={formatJPY(data.kpi.feeTotal)} />
            <StatCard label="返金・チャージバック" value={formatJPY(data.kpi.refundTotal)} />
            <StatCard
              label="当月純売上"
              value={formatJPY(data.kpi.netRevenue)}
              deltaLabel={netRevenueDelta !== null ? `前月比 ${netRevenueDelta >= 0 ? "+" : ""}${netRevenueDelta}%` : undefined}
              deltaTone={netRevenueDelta === null ? "neutral" : netRevenueDelta >= 0 ? "positive" : "negative"}
            />
            <StatCard label="有料契約者数" value={formatNumber(data.kpi.activeSubscribers)} />
            <StatCard label="新規契約数" value={formatNumber(data.kpi.newContracts)} />
            <StatCard label="解約数" value={formatNumber(data.kpi.canceledContracts)} />
            <StatCard label="MRR" value={formatJPY(data.kpi.mrr)} />
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">純売上の推移（過去6ヶ月）</h2>
          <div className="rounded-md border border-border p-3">
            <RevenueTrendChart data={revenueTrend} />
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">サービス別利用者数</h2>
            <div className="rounded-md border border-border">
              {data.services.map((service) => {
                const count = data.usersByService.find((u) => u.serviceId === service.id)?.count ?? 0;
                const tone = healthTone(service.status);
                return (
                  <div
                    key={service.id}
                    className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                  >
                    <div className="flex items-center gap-2">
                      <span>{service.name}</span>
                      <StatusBadge label={tone.label} tone={tone.tone} />
                    </div>
                    <span className="tabular-nums font-medium">{formatNumber(count)}人</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">処理・配信の状態</h2>
            <div className="space-y-2 rounded-md border border-border p-3 text-sm">
              <Row
                label="処理ジョブ（過去7日）"
                value={`成功 ${data.jobs.success}件 / 失敗 ${data.jobs.failure}件`}
                tone={data.jobs.failure > 0 ? "danger" : "success"}
              />
              <Row
                label="Stripe Webhook 失敗"
                value={`${data.webhooks.stripe?.failureCount ?? 0}件`}
                tone={(data.webhooks.stripe?.failureCount ?? 0) > 0 ? "danger" : "success"}
              />
              <Row
                label="PayPal Webhook 失敗"
                value={`${data.webhooks.paypal?.failureCount ?? 0}件`}
                tone={(data.webhooks.paypal?.failureCount ?? 0) > 0 ? "danger" : "success"}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone: "success" | "danger" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={tone === "danger" ? "font-medium text-danger" : "font-medium text-foreground"}>
        {value}
      </span>
    </div>
  );
}
