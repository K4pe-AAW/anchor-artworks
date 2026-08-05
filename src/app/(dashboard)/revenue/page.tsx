import { Download, ExternalLink, Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/filter-bar";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState } from "@/components/state/empty-state";
import { formatDateTime, formatJPY } from "@/lib/format";
import { parseFilters } from "@/lib/filters";
import { getServiceOptions } from "@/server/overview";
import { listPaymentTransactions } from "@/server/revenue";
import { getLatestInsight } from "@/server/ai-insights";
import { isAnthropicConfigured } from "@/lib/anthropic-client";
import { AiInsightCard } from "./ai-insight-card";

function statusTone(status: string): "success" | "warning" | "danger" | "neutral" {
  if (status === "succeeded") return "success";
  if (status === "refunded") return "warning";
  if (status === "failed") return "danger";
  return "neutral";
}

const PROVIDER_CONSOLE_URL: Record<string, string> = {
  STRIPE: "https://dashboard.stripe.com/payments",
  PAYPAL: "https://www.paypal.com/activity",
};

export default async function RevenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const filters = parseFilters(resolvedParams);
  const query = typeof resolvedParams.q === "string" ? resolvedParams.q : undefined;

  const [services, transactions, latestInsight] = await Promise.all([
    getServiceOptions(),
    listPaymentTransactions(filters, query),
    getLatestInsight(filters.period),
  ]);

  const csvHref = `/api/export/revenue?${new URLSearchParams({
    period: filters.period,
    ...(filters.serviceId ? { service: filters.serviceId } : {}),
    ...(filters.provider ? { provider: filters.provider } : {}),
    ...(filters.plan ? { plan: filters.plan } : {}),
    ...(query ? { q: query } : {}),
  }).toString()}`;

  return (
    <div>
      <PageHeader
        title="売上"
        description="Stripe／PayPalの売上を共通形式で表示します（読み取り専用・参考値）"
        actions={
          <a href={csvHref} className={buttonVariants({ size: "sm", variant: "outline" })}>
            <Download className="size-4" />
            CSV出力
          </a>
        }
      />
      <FilterBar services={services} />

      <div className="space-y-3 p-4 sm:p-6">
        <AiInsightCard
          periodKey={filters.period}
          configured={isAnthropicConfigured()}
          initialContent={latestInsight?.content ?? null}
          initialCreatedAt={latestInsight?.createdAt.toISOString() ?? null}
        />

        <form className="max-w-sm" action="" method="get">
          {/* フィルタ値を維持したまま検索するため hidden フィールドで引き継ぐ */}
          <input type="hidden" name="period" value={filters.period} />
          {filters.serviceId ? <input type="hidden" name="service" value={filters.serviceId} /> : null}
          {filters.provider ? <input type="hidden" name="provider" value={filters.provider} /> : null}
          {filters.plan ? <input type="hidden" name="plan" value={filters.plan} /> : null}
          <Input
            name="q"
            defaultValue={query}
            placeholder="外部決済IDまたはメールアドレスで検索"
            className="h-8 text-sm"
          />
        </form>

        <p className="text-xs text-muted-foreground">
          管理サイト上の集計値は参考値です。正式な会計データはStripe／PayPalの記録を正としてください。
        </p>

        {transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="該当する取引がありません"
            description="期間やフィルタ条件を変更するか、決済会社側の管理画面をご確認ください。"
          />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日時</TableHead>
                  <TableHead>サービス</TableHead>
                  <TableHead>決済会社</TableHead>
                  <TableHead>利用者</TableHead>
                  <TableHead>プラン</TableHead>
                  <TableHead className="text-right">総額</TableHead>
                  <TableHead className="text-right">手数料</TableHead>
                  <TableHead className="text-right">返金額</TableHead>
                  <TableHead className="text-right">純額</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>外部決済ID</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatDateTime(t.occurredAt)}
                    </TableCell>
                    <TableCell>{t.service.name}</TableCell>
                    <TableCell>
                      <a
                        href={PROVIDER_CONSOLE_URL[t.provider]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 hover:underline"
                      >
                        {t.provider === "STRIPE" ? "Stripe" : "PayPal"}
                        <ExternalLink className="size-3" />
                      </a>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{t.emailMasked}</TableCell>
                    <TableCell>{t.plan ?? "-"}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatJPY(t.grossAmount)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {formatJPY(t.feeAmount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {t.refundAmount > 0 ? formatJPY(t.refundAmount) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">
                      {formatJPY(t.netAmount)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={t.status} tone={statusTone(t.status)} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {t.externalPaymentId}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
