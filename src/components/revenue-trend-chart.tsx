"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatJPY } from "@/lib/format";

const chartConfig = {
  netRevenue: {
    label: "純売上",
    // UIのアクセント（#ecc9d7）はパステルで背景と馴染みすぎるため、
    // グラフの可読性を優先しやや濃いめのトーンに寄せている。
    color: "#d6608f",
  },
} satisfies ChartConfig;

export function RevenueTrendChart({
  data,
}: {
  data: { period: string; netRevenue: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[180px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="period"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={11}
          stroke="var(--muted-foreground)"
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatJPY(Number(value))}
              labelKey="period"
            />
          }
        />
        <Bar dataKey="netRevenue" fill="var(--color-netRevenue)" radius={4} maxBarSize={40} />
      </BarChart>
    </ChartContainer>
  );
}
