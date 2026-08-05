import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, healthTone } from "@/components/status-badge";
import { formatDateTime, formatJPY, formatNumber } from "@/lib/format";
import { listServicesWithSummary } from "@/server/services";

export default async function ServicesPage() {
  const rows = await listServicesWithSummary();

  return (
    <div>
      <PageHeader title="サービス" description="登録済みサービスの稼働状態と主要指標" />
      <div className="p-4 sm:p-6">
        <div className="overflow-x-auto rounded-md border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>サービス名</TableHead>
                <TableHead>稼働状態</TableHead>
                <TableHead className="text-right">登録利用者数</TableHead>
                <TableHead className="text-right">有料契約者数</TableHead>
                <TableHead className="text-right">当月売上</TableHead>
                <TableHead>Webhook</TableHead>
                <TableHead>最終同期</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ service, userCount, activeSubCount, currentMonthRevenue, webhookStatus }) => {
                const tone = healthTone(service.status);
                return (
                  <TableRow key={service.id} className="cursor-pointer">
                    <TableCell>
                      <Link href={`/services/${service.slug}`} className="font-medium hover:underline">
                        {service.name}
                      </Link>
                      <a
                        href={service.publicUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="ml-2 inline-flex items-center text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="size-3" />
                      </a>
                    </TableCell>
                    <TableCell>
                      <StatusBadge label={tone.label} tone={tone.tone} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(userCount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(activeSubCount)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatJPY(currentMonthRevenue)}</TableCell>
                    <TableCell>
                      <StatusBadge
                        label={webhookStatus === "success" ? "正常" : webhookStatus === "warning" ? "注意" : "未設定"}
                        tone={webhookStatus}
                      />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDateTime(service.lastSyncedAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
