import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge, healthTone } from "@/components/status-badge";
import { SyncStatus } from "@/components/state/sync-status";
import { formatDateTime, formatJPY, formatNumber } from "@/lib/format";
import { getServiceDetail } from "@/server/services";
import { SyncButton } from "./sync-button";

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const detail = await getServiceDetail(slug);
  if (!detail) notFound();

  const { service, planCounts, usage, jobRuns, integrations, revenue } = detail;
  const tone = healthTone(service.status);
  const isPdcCleaner = service.slug === "pdc-cleaner";

  return (
    <div>
      <PageHeader
        title={service.name}
        breadcrumb={[{ label: "サービス", href: "/services" }, { label: service.name }]}
        description={service.publicUrl}
        actions={
          <a
            href={service.publicUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            サイトを開く <ExternalLink className="size-3.5" />
          </a>
        }
      />

      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge label={`稼働状態: ${tone.label}`} tone={tone.tone} />
            <SyncStatus lastSyncedAt={service.lastSyncedAt} error={service.lastSyncError} />
          </div>
          <SyncButton serviceId={service.id} slug={service.slug} />
        </div>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">主要指標</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="当月売上（純額）" value={formatJPY(revenue?.netRevenue ?? 0)} />
            <StatCard label="MRR" value={formatJPY(revenue?.mrr ?? 0)} />
            <StatCard
              label="有料契約者数"
              value={formatNumber(
                planCounts
                  .filter((p) => p.currentPlan !== "free" && p.currentPlan !== "trial")
                  .reduce((sum, p) => sum + p._count._all, 0),
              )}
            />
            <StatCard
              label="登録利用者数"
              value={formatNumber(planCounts.reduce((sum, p) => sum + p._count._all, 0))}
            />
          </div>
        </section>

        {isPdcCleaner ? (
          <section>
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">
              PDC Cleaner 固有指標
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {["trial", "free", "personal", "pro"].map((plan) => {
                const count = planCounts.find((p) => p.currentPlan === plan)?._count._all ?? 0;
                return (
                  <StatCard
                    key={plan}
                    label={`${plan[0].toUpperCase()}${plan.slice(1)} 人数`}
                    value={formatNumber(count)}
                  />
                );
              })}
              <StatCard
                label="月間処理時間（合計・時間）"
                value={formatNumber(Math.round((usage._sum.currentMonthUsage ?? 0) * 10) / 10)}
              />
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">連携状態</h2>
          <div className="rounded-md border border-border">
            {integrations.map((integration) => (
              <div
                key={integration.id}
                className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
              >
                <span>{integration.kind}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {integration.isConfigured
                      ? `設定済み ${integration.maskedValueHint ?? ""}`
                      : "未設定"}
                  </span>
                  <StatusBadge
                    label={
                      integration.lastStatus === "OK"
                        ? "正常"
                        : integration.lastStatus === "WARNING"
                          ? "注意"
                          : integration.lastStatus === "ERROR"
                            ? "障害"
                            : "不明"
                    }
                    tone={
                      integration.lastStatus === "OK"
                        ? "success"
                        : integration.lastStatus === "WARNING"
                          ? "warning"
                          : integration.lastStatus === "ERROR"
                            ? "danger"
                            : "neutral"
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            バックグラウンドジョブ（直近実行）
          </h2>
          <div className="rounded-md border border-border">
            {jobRuns.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">実行履歴がありません</p>
            ) : (
              jobRuns.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span>{job.jobName}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      {formatDateTime(job.startedAt)}
                    </span>
                    <StatusBadge
                      label={job.status === "SUCCESS" ? "成功" : job.status === "FAILURE" ? "失敗" : "実行中"}
                      tone={job.status === "SUCCESS" ? "success" : job.status === "FAILURE" ? "danger" : "warning"}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
