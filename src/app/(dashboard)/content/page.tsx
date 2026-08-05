import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentTrendChart } from "@/components/content-trend-chart-loader";
import { RecordSnapshotDialog } from "./record-snapshot-dialog";
import { CONTENT_PLATFORM_META, type ContentPlatformKey } from "@/lib/content-platforms";
import { formatDateTime, formatNumber } from "@/lib/format";
import type { Granularity } from "@/lib/date-buckets";
import { getChannelTrend, listChannelsWithLatest } from "@/server/content";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const granularity: Granularity = resolved.granularity === "month" ? "month" : "week";

  const channels = await listChannelsWithLatest();
  const trends = await Promise.all(
    channels.map((channel) => getChannelTrend(channel.id, granularity)),
  );

  return (
    <div>
      <PageHeader
        title="コンテンツ"
        description="Podcast・YouTube・Instagram・TikTokのサマリー（数値は必要な都度、手動で記録します）"
        actions={
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <GranularityLink granularity="week" current={granularity} label="週次" />
            <GranularityLink granularity="month" current={granularity} label="月次" />
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 sm:p-6">
        {channels.map((channel, index) => {
          const meta = CONTENT_PLATFORM_META[channel.platform as ContentPlatformKey];
          const Icon = meta.icon;
          const trend = trends[index];
          return (
            <div key={channel.id} className="rounded-md border border-border p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted">
                    <Icon className="size-4" strokeWidth={2} />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">{channel.name}</p>
                  </div>
                </div>
                <Link
                  href={channel.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  開く <ExternalLink className="size-3" />
                </Link>
              </div>

              <div className="mb-3 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{meta.followersLabel}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {channel.latest?.followers != null ? formatNumber(channel.latest.followers) : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{meta.viewsLabel}</p>
                  <p className="text-lg font-semibold tabular-nums">
                    {channel.latest?.periodViews != null
                      ? formatNumber(channel.latest.periodViews)
                      : "-"}
                  </p>
                </div>
              </div>

              <ContentTrendChart data={trend} />

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  最終記録: {channel.latest ? formatDateTime(channel.latest.capturedAt) : "未記録"}
                </p>
                <RecordSnapshotDialog
                  channelId={channel.id}
                  channelName={meta.label}
                  followersLabel={meta.followersLabel}
                  viewsLabel={meta.viewsLabel}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GranularityLink({
  granularity,
  current,
  label,
}: {
  granularity: Granularity;
  current: Granularity;
  label: string;
}) {
  const active = granularity === current;
  return (
    <Link
      href={`/content?granularity=${granularity}`}
      className={
        active
          ? "rounded-[5px] bg-brand px-2.5 py-1 text-xs font-medium text-brand-foreground"
          : "rounded-[5px] px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </Link>
  );
}
