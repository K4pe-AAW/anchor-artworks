import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge, healthTone } from "@/components/status-badge";
import { formatDateTime } from "@/lib/format";
import { getSystemHealth } from "@/server/system";

export default async function SystemPage() {
  const { services, webhookEvents, latestJobs, smtpIntegrations } = await getSystemHealth();

  return (
    <div>
      <PageHeader title="システム" description="各サービスの稼働・連携状態をまとめて確認します" />
      <div className="space-y-6 p-4 sm:p-6">
        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">サービスヘルスチェック</h2>
          <div className="rounded-md border border-border">
            {services.map((service) => {
              const tone = healthTone(service.status);
              return (
                <Row
                  key={service.id}
                  label={service.name}
                  detail={`最終同期: ${formatDateTime(service.lastSyncedAt)}`}
                  status={tone.label}
                  tone={tone.tone}
                />
              );
            })}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Webhook受信状態</h2>
          <div className="rounded-md border border-border">
            {webhookEvents.map((event) => (
              <Row
                key={event.id}
                label={`${event.service.name} / ${event.provider === "STRIPE" ? "Stripe" : "PayPal"}`}
                detail={`最終受信: ${formatDateTime(event.lastReceivedAt)}${
                  event.failureCount > 0 ? ` / 失敗 ${event.failureCount}件` : ""
                }`}
                status={event.failureCount === 0 ? "正常" : event.failureCount < 5 ? "注意" : "障害"}
                tone={event.failureCount === 0 ? "success" : event.failureCount < 5 ? "warning" : "danger"}
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">SMTP送信状態</h2>
          <div className="rounded-md border border-border">
            {smtpIntegrations.map((integration) => (
              <Row
                key={integration.id}
                label={integration.service.name}
                detail={`最終確認: ${formatDateTime(integration.lastCheckedAt)}`}
                status={
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
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">定期ジョブ最終実行</h2>
          <div className="rounded-md border border-border">
            {latestJobs.map((job) => (
              <Row
                key={job.id}
                label={`${job.service.name} / ${job.jobName}`}
                detail={formatDateTime(job.startedAt)}
                status={job.status === "SUCCESS" ? "正常" : job.status === "FAILURE" ? "障害" : "注意"}
                tone={job.status === "SUCCESS" ? "success" : job.status === "FAILURE" ? "danger" : "warning"}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({
  label,
  detail,
  status,
  tone,
}: {
  label: string;
  detail: string;
  status: string;
  tone: "success" | "warning" | "danger" | "neutral";
}) {
  return (
    <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0">
      <div>
        <p>{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <StatusBadge label={status} tone={tone} />
    </div>
  );
}
