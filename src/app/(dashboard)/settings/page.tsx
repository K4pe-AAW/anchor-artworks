import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/status-badge";
import { Timeline } from "@/components/timeline";
import { TestNotificationButton } from "./test-notification-button";
import { formatDateTime } from "@/lib/format";
import { isEmailConfigured, isSlackConfigured } from "@/lib/notify";
import { listAdministrators, listAuditLogs, listIntegrations } from "@/server/settings";

const INTEGRATION_LABEL: Record<string, string> = {
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
  SMTP: "SMTP",
  INTERNAL_API: "サービス内部API",
};

export default async function SettingsPage() {
  const [administrators, integrations, auditLogs] = await Promise.all([
    listAdministrators(),
    listIntegrations(),
    listAuditLogs(),
  ]);

  return (
    <div>
      <PageHeader title="設定" description="運営に必要な設定項目のみを表示します" />
      <div className="p-4 sm:p-6">
        <Tabs defaultValue="administrators">
          <TabsList className="flex-wrap">
            <TabsTrigger value="administrators">管理者アカウント</TabsTrigger>
            <TabsTrigger value="mfa">多要素認証</TabsTrigger>
            <TabsTrigger value="services">サービス登録</TabsTrigger>
            <TabsTrigger value="notifications">通知先</TabsTrigger>
            <TabsTrigger value="timezone">タイムゾーン</TabsTrigger>
            <TabsTrigger value="email">メール送信者情報</TabsTrigger>
            <TabsTrigger value="integrations">API連携状態</TabsTrigger>
            <TabsTrigger value="audit">監査ログ</TabsTrigger>
          </TabsList>

          <TabsContent value="administrators" className="mt-4">
            <div className="rounded-md border border-border">
              {administrators.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <div>
                    <p className="font-medium">{admin.displayName}</p>
                    <p className="text-xs text-muted-foreground">{admin.email}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{admin.role === "OWNER" ? "オーナー" : "運用担当"}</span>
                    <span>最終ログイン: {formatDateTime(admin.lastLoginAt)}</span>
                    <StatusBadge
                      label={admin.isActive ? "有効" : "無効"}
                      tone={admin.isActive ? "success" : "neutral"}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              管理者の追加・削除はデータベース側での作業が必要です（第1段階ではUIからの追加に対応していません）。
            </p>
          </TabsContent>

          <TabsContent value="mfa" className="mt-4">
            <div className="rounded-md border border-border">
              {administrators.map((admin) => (
                <div
                  key={admin.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span>{admin.email}</span>
                  <StatusBadge
                    label={admin.mfaEnabledAt ? "有効" : "未設定"}
                    tone={admin.mfaEnabledAt ? "success" : "danger"}
                  />
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              MFA未設定の管理者はログインできません（起動時のセキュリティ要件）。
            </p>
          </TabsContent>

          <TabsContent value="services" className="mt-4">
            <p className="text-sm text-muted-foreground">
              サービスの登録・編集は「サービス」画面から確認できます。追加登録のUIは今後の段階で対応します。
            </p>
          </TabsContent>

          <TabsContent value="notifications" className="mt-4 space-y-4">
            <div className="rounded-md border border-border">
              <div className="flex items-center justify-between border-b border-border px-3 py-2 text-sm">
                <span>Slack（Incoming Webhook）</span>
                <StatusBadge
                  label={isSlackConfigured() ? "設定済み" : "未設定"}
                  tone={isSlackConfigured() ? "success" : "neutral"}
                />
              </div>
              <div className="flex items-center justify-between px-3 py-2 text-sm">
                <span>メール</span>
                <StatusBadge
                  label={isEmailConfigured() ? "設定済み" : "未設定"}
                  tone={isEmailConfigured() ? "success" : "neutral"}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              環境変数 <code className="font-mono">NOTIFY_SLACK_WEBHOOK_URL</code>（Slack）、
              <code className="font-mono">SMTP_HOST</code> / <code className="font-mono">SMTP_FROM_EMAIL</code> /{" "}
              <code className="font-mono">NOTIFY_EMAIL_TO</code>（メール）を設定すると有効になります。
              「要確認事項」が発生した際、概要画面の表示に合わせて自動で通知します（同じ内容は6時間は再送しません）。
            </p>
            <TestNotificationButton />
          </TabsContent>

          <TabsContent value="timezone" className="mt-4">
            <p className="text-sm">Asia/Tokyo（固定）</p>
          </TabsContent>

          <TabsContent value="email" className="mt-4">
            <p className="text-sm text-muted-foreground">
              送信者情報はサービスごとの環境変数（SMTP_FROM_EMAIL等）で管理されます。値そのものはここに表示しません。
            </p>
          </TabsContent>

          <TabsContent value="integrations" className="mt-4">
            <div className="rounded-md border border-border">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <span>
                    {integration.service.name} / {INTEGRATION_LABEL[integration.kind]}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
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
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <div className="rounded-md border border-border px-4 py-4">
              <Timeline
                entries={auditLogs.map((log) => ({
                  id: log.id,
                  actorLabel: log.administrator?.email ?? "system",
                  action: log.action,
                  targetLabel: log.targetType
                    ? `${log.targetType}:${log.targetId ?? ""}`
                    : undefined,
                  timestamp: log.createdAt,
                }))}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              監査ログは追記専用です。アプリからの更新・削除操作は提供していません。
            </p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
