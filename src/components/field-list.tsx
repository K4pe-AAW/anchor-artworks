import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Twenty CRMのレコード詳細（Fields）を参考にした、枠なし・ラベル/値の一覧表示。
 * 箱で囲わず、行間だけで区切ることで情報密度を上げつつ視認性を保つ。
 */
export function FieldList({ children }: { children: ReactNode }) {
  return <div className="divide-y divide-border">{children}</div>;
}

export function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon?: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <div className="flex w-36 shrink-0 items-center gap-1.5 text-muted-foreground">
        {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={2} /> : null}
        <span className="truncate">{label}</span>
      </div>
      <div className="min-w-0 flex-1 text-foreground">{children}</div>
    </div>
  );
}
