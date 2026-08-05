import { PageHeader } from "@/components/layout/page-header";
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
import { formatDateTime, formatNumber } from "@/lib/format";
import { listDeliveries } from "@/server/deliveries";
import { History } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  CRITICAL: "重要なお知らせ",
  MARKETING: "製品・マーケティング情報",
};

export default async function DeliveriesPage() {
  const deliveries = await listDeliveries();

  return (
    <div>
      <PageHeader title="配信履歴" description="お知らせの配信結果一覧" />
      <div className="p-4 sm:p-6">
        {deliveries.length === 0 ? (
          <EmptyState icon={History} title="配信履歴はまだありません" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>お知らせ名</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead className="text-right">配信予定数</TableHead>
                  <TableHead className="text-right">成功</TableHead>
                  <TableHead className="text-right">失敗</TableHead>
                  <TableHead className="text-right">開封</TableHead>
                  <TableHead>配信日時</TableHead>
                  <TableHead>実行者</TableHead>
                  <TableHead>状態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">{delivery.announcement.title}</TableCell>
                    <TableCell>{CATEGORY_LABEL[delivery.announcement.category]}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(delivery.targetCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(delivery.successCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-danger">
                      {formatNumber(delivery.failureCount)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatNumber(delivery.openCount)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(delivery.startedAt)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {delivery.announcement.createdBy.displayName}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        label={delivery.status}
                        tone={
                          delivery.status === "COMPLETED"
                            ? "success"
                            : delivery.status === "FAILED"
                              ? "danger"
                              : "neutral"
                        }
                      />
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
