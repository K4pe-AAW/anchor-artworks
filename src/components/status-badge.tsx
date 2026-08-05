import { cn } from "@/lib/utils";

export type StatusTone = "success" | "warning" | "danger" | "neutral";

const TONE_CLASS: Record<StatusTone, string> = {
  success: "bg-success/15 text-success border-success/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  danger: "bg-danger/15 text-danger border-danger/30",
  neutral: "bg-muted text-muted-foreground border-border",
};

export function StatusBadge({ label, tone }: { label: string; tone: StatusTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium leading-none",
        TONE_CLASS[tone],
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          tone === "success" && "bg-success",
          tone === "warning" && "bg-warning",
          tone === "danger" && "bg-danger",
          tone === "neutral" && "bg-muted-foreground",
        )}
      />
      {label}
    </span>
  );
}

/** システム画面の「正常/注意/障害」3段階表示用ヘルパー。 */
export function healthTone(status: "OPERATIONAL" | "DEGRADED" | "DOWN" | "UNKNOWN"): {
  label: string;
  tone: StatusTone;
} {
  switch (status) {
    case "OPERATIONAL":
      return { label: "正常", tone: "success" };
    case "DEGRADED":
      return { label: "注意", tone: "warning" };
    case "DOWN":
      return { label: "障害", tone: "danger" };
    default:
      return { label: "不明", tone: "neutral" };
  }
}
