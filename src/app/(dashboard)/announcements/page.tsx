import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, type StatusTone } from "@/components/status-badge";
import { EmptyState } from "@/components/state/empty-state";
import { formatDateTime } from "@/lib/format";
import { listAnnouncements } from "@/server/announcements";
import { Megaphone } from "lucide-react";

const CATEGORY_LABEL: Record<string, string> = {
  CRITICAL: "重要なお知らせ",
  MARKETING: "製品・マーケティング情報",
};

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  DRAFT: { label: "下書き", tone: "neutral" },
  SCHEDULED: { label: "配信予約", tone: "warning" },
  SENDING: { label: "配信中", tone: "warning" },
  SENT: { label: "配信済み", tone: "success" },
  CANCELED: { label: "停止", tone: "neutral" },
  FAILED: { label: "失敗", tone: "danger" },
};

export default async function AnnouncementsPage() {
  const announcements = await listAnnouncements();

  return (
    <div>
      <PageHeader
        title="お知らせ"
        description="作成・配信・予約機能は第4段階で実装予定です。現在は既存お知らせの確認のみ行えます。"
      />
      <div className="p-4 sm:p-6">
        {announcements.length === 0 ? (
          <EmptyState icon={Megaphone} title="お知らせはまだありません" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>タイトル</TableHead>
                  <TableHead>種別</TableHead>
                  <TableHead>状態</TableHead>
                  <TableHead>作成者</TableHead>
                  <TableHead>配信日時</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((a) => {
                  const status = STATUS_LABEL[a.status];
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Link href={`/announcements/${a.id}`} className="font-medium hover:underline">
                          {a.title}
                        </Link>
                      </TableCell>
                      <TableCell>{CATEGORY_LABEL[a.category]}</TableCell>
                      <TableCell>
                        <StatusBadge label={status.label} tone={status.tone} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {a.createdBy.displayName}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(a.sentAt ?? a.scheduledAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
