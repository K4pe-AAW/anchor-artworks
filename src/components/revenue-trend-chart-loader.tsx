"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// Rechartsはユニーク要素IDをReactのuseId()ではなくモジュール内カウンタで発行するため、
// サーバー/クライアント間でIDがずれてハイドレーションエラーになる。SSRを無効化して回避する。
// （`ssr: false` はClient Component内でのみ指定できるため、このラッパーに分離している）
export const RevenueTrendChart = dynamic(
  () => import("@/components/revenue-trend-chart").then((m) => m.RevenueTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[180px] w-full" /> },
);
