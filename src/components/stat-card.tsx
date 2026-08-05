import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  deltaLabel?: string;
  deltaTone?: "positive" | "negative" | "neutral";
}

export function StatCard({ label, value, deltaLabel, deltaTone = "neutral" }: StatCardProps) {
  return (
    <div className="rounded-md border border-border bg-card p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
      {deltaLabel ? (
        <p
          className={cn(
            "mt-1 flex items-center gap-0.5 text-xs",
            deltaTone === "positive" && "text-success",
            deltaTone === "negative" && "text-danger",
            deltaTone === "neutral" && "text-muted-foreground",
          )}
        >
          {deltaTone === "positive" ? <ArrowUpRight className="size-3" /> : null}
          {deltaTone === "negative" ? <ArrowDownRight className="size-3" /> : null}
          {deltaLabel}
        </p>
      ) : null}
    </div>
  );
}
