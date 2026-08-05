import { AlertTriangle, RefreshCw } from "lucide-react";

function formatDateTime(date: Date | null) {
  if (!date) return "未同期";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

/**
 * 「API取得に失敗した場合は、古い数値を最新値のように表示せず、
 * 最終同期日時とエラー状態を表示する」という要件に対応する共通表示。
 */
export function SyncStatus({
  lastSyncedAt,
  error,
}: {
  lastSyncedAt: Date | null;
  error?: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-danger">
        <AlertTriangle className="size-3.5" />
        <span>
          同期エラー（最終成功: {formatDateTime(lastSyncedAt)}） — {error}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <RefreshCw className="size-3.5" />
      <span>最終同期: {formatDateTime(lastSyncedAt)}</span>
    </div>
  );
}
