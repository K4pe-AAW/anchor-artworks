"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// RevenueTrendChartと同様、RechartsのSSRハイドレーション不整合を避けるためクライアント専用にする。
export const ContentTrendChart = dynamic(
  () => import("@/components/content-trend-chart").then((m) => m.ContentTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[140px] w-full" /> },
);
