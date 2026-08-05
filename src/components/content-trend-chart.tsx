"use client";

import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatNumber } from "@/lib/format";

const chartConfig = {
  periodViews: {
    label: "再生・視聴数",
    color: "#d6608f",
  },
} satisfies ChartConfig;

export function ContentTrendChart({
  data,
}: {
  data: { bucket: string; periodViews: number }[];
}) {
  return (
    <ChartContainer config={chartConfig} className="h-[140px] w-full">
      <BarChart data={data} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis
          dataKey="bucket"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          fontSize={10}
          stroke="var(--muted-foreground)"
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => formatNumber(Number(value))}
              labelKey="bucket"
            />
          }
        />
        <Bar dataKey="periodViews" fill="var(--color-periodViews)" radius={3} maxBarSize={28} />
      </BarChart>
    </ChartContainer>
  );
}
