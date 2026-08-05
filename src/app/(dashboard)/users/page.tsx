import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/filter-bar";
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
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { parseFilters } from "@/lib/filters";
import { getServiceOptions } from "@/server/overview";
import { listServiceUsers } from "@/server/users";
import { Users } from "lucide-react";

const STATUS_LABEL: Record<string, { label: string; tone: StatusTone }> = {
  active: { label: "契約中", tone: "success" },
  past_due: { label: "支払い遅延", tone: "warning" },
  canceled: { label: "解約済み", tone: "neutral" },
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const filters = parseFilters(resolved);
  const [services, users] = await Promise.all([
    getServiceOptions(),
    listServiceUsers({ serviceId: filters.serviceId, plan: filters.plan }),
  ]);

  return (
    <div>
      <PageHeader title="利用者・契約" description="サービス横断の利用者一覧（読み取り専用）" />
      <FilterBar services={services} showProvider={false} />

      <div className="p-4 sm:p-6">
        {users.length === 0 ? (
          <EmptyState icon={Users} title="該当する利用者がいません" />
        ) : (
          <div className="overflow-x-auto rounded-md border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>サービス</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>現在のプラン</TableHead>
                  <TableHead>契約状態</TableHead>
                  <TableHead>登録日</TableHead>
                  <TableHead>最終利用日時</TableHead>
                  <TableHead className="text-right">当月利用量</TableHead>
                  <TableHead>決済会社</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const status = STATUS_LABEL[user.contractStatus] ?? {
                    label: user.contractStatus,
                    tone: "neutral" as const,
                  };
                  return (
                    <TableRow key={user.id}>
                      <TableCell>{user.service.name}</TableCell>
                      <TableCell>
                        <Link href={`/users/${user.id}`} className="font-mono text-xs hover:underline">
                          {user.emailMasked}
                        </Link>
                      </TableCell>
                      <TableCell className="capitalize">{user.currentPlan}</TableCell>
                      <TableCell>
                        <StatusBadge label={status.label} tone={status.tone} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDate(user.registeredAt)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDateTime(user.lastActiveAt)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatNumber(user.currentMonthUsage ?? 0)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {user.paymentProvider ?? "-"}
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
