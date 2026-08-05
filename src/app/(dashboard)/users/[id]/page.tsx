import { notFound } from "next/navigation";
import { CreditCard, RefreshCcw, TrendingUp, Wallet } from "lucide-react";
import { auth } from "@/auth";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/status-badge";
import { FieldList, FieldRow } from "@/components/field-list";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { getServiceUserDetail } from "@/server/users";
import { recordAuditLog } from "@/lib/audit";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getServiceUserDetail(id);
  if (!user) notFound();

  const session = await auth();
  // 利用者詳細の閲覧は監査ログへ記録する（要件）。
  await recordAuditLog({
    administratorId: session?.user.id ?? null,
    action: "user.detail.viewed",
    targetType: "service_user_snapshot",
    targetId: user.id,
  });

  return (
    <div>
      <PageHeader
        title={user.emailMasked}
        breadcrumb={[{ label: "利用者・契約", href: "/users" }, { label: user.emailMasked }]}
        description={`${user.service.name} / 登録日: ${formatDate(user.registeredAt)}`}
      />

      <div className="space-y-6 p-4 sm:p-6">
        <section>
          <h2 className="mb-1 text-sm font-medium text-muted-foreground">概要</h2>
          <FieldList>
            <FieldRow icon={TrendingUp} label="現在のプラン">
              <span className="capitalize">{user.currentPlan}</span>
            </FieldRow>
            <FieldRow icon={RefreshCcw} label="契約状態">
              <span className="capitalize">{user.contractStatus}</span>
            </FieldRow>
            <FieldRow icon={CreditCard} label="決済会社">
              {user.paymentProvider ?? "-"}
            </FieldRow>
            <FieldRow icon={Wallet} label="当月利用量">
              {formatNumber(user.currentMonthUsage ?? 0)}
            </FieldRow>
          </FieldList>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">契約履歴</h2>
          <div className="rounded-md border border-border">
            {user.subscriptionSnapshots.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">契約スナップショットがありません</p>
            ) : (
              user.subscriptionSnapshots.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between border-b border-border px-3 py-2 text-sm last:border-b-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="capitalize">{sub.plan}</span>
                    <StatusBadge
                      label={sub.status}
                      tone={sub.status === "active" ? "success" : "neutral"}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    次回更新: {formatDateTime(sub.currentPeriodEnd)}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>

        <p className="text-xs text-muted-foreground">
          パスワード・カード番号・音声ファイル等はこの画面に一切表示されません。
        </p>
      </div>
    </div>
  );
}
