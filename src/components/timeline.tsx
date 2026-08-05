import type { LucideIcon } from "lucide-react";
import {
  LogIn,
  ShieldAlert,
  Eye,
  Download,
  Database,
  Megaphone,
  Activity,
} from "lucide-react";
import { formatDateTime } from "@/lib/format";

export interface TimelineEntry {
  id: string;
  actorLabel: string;
  action: string;
  targetLabel?: string;
  timestamp: Date;
}

function iconForAction(action: string): LucideIcon {
  if (action.startsWith("auth.login.success")) return LogIn;
  if (action.startsWith("auth.")) return ShieldAlert;
  if (action.startsWith("user.detail")) return Eye;
  if (action.startsWith("revenue.")) return Download;
  if (action.startsWith("seed.")) return Database;
  if (action.startsWith("announcement.")) return Megaphone;
  return Activity;
}

/** Twenty CRMの「Timeline」タブを参考にした、監査ログ向けの縦タイムライン表示。 */
export function Timeline({ entries }: { entries: TimelineEntry[] }) {
  if (entries.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">記録がありません</p>;
  }

  return (
    <ol className="relative">
      {entries.map((entry, index) => {
        const Icon = iconForAction(entry.action);
        const isLast = index === entries.length - 1;
        return (
          <li key={entry.id} className="relative flex gap-3 pb-5 last:pb-0">
            {!isLast ? (
              <span className="absolute top-6 left-[11px] h-[calc(100%-1.25rem)] w-px bg-border" />
            ) : null}
            <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-border bg-background">
              <Icon className="size-3.5 text-muted-foreground" strokeWidth={2} />
            </span>
            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pt-0.5">
              <p className="min-w-0 text-sm text-foreground">
                <span className="font-medium">{entry.actorLabel}</span>{" "}
                <span className="font-mono text-xs text-muted-foreground">{entry.action}</span>
                {entry.targetLabel ? (
                  <span className="text-muted-foreground"> — {entry.targetLabel}</span>
                ) : null}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatDateTime(entry.timestamp)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
