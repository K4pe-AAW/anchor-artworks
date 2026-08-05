import { db } from "@/lib/db";
import { bucketKey, bucketLabel, recentBucketKeys, type Granularity } from "@/lib/date-buckets";
import { CONTENT_PLATFORM_META, type ContentPlatformKey } from "@/lib/content-platforms";

export async function listChannelsWithLatest() {
  const channels = await db.contentChannel.findMany({
    orderBy: { platform: "asc" },
    include: {
      snapshots: {
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
    },
  });

  return channels.map((channel) => ({
    ...channel,
    latest: channel.snapshots[0] ?? null,
  }));
}

export async function getChannelDetail(id: string) {
  return db.contentChannel.findUnique({
    where: { id },
    include: {
      snapshots: { orderBy: { capturedAt: "desc" }, take: 1 },
    },
  });
}

/** 指定チャンネルの週次/月次推移（直近8バケット分）。フォロワーは各バケット内の最新値、再生・エンゲージメントは合算する。 */
export async function getChannelTrend(channelId: string, granularity: Granularity) {
  const bucketCount = 8;
  const keys = recentBucketKeys(bucketCount, granularity);
  const since = new Date();
  since.setDate(since.getDate() - (granularity === "week" ? 7 * bucketCount : 0));
  if (granularity === "month") {
    since.setMonth(since.getMonth() - bucketCount);
  }

  const snapshots = await db.contentChannelSnapshot.findMany({
    where: { channelId, capturedAt: { gte: since } },
    orderBy: { capturedAt: "asc" },
  });

  return keys.map((key) => {
    const inBucket = snapshots.filter((s) => bucketKey(s.capturedAt, granularity) === key);
    const latest = inBucket.at(-1);
    const periodViews = inBucket.reduce((total, s) => total + (s.periodViews ?? 0), 0);
    return {
      bucket: bucketLabel(key, granularity),
      followers: latest?.followers ?? null,
      periodViews,
    };
  });
}

export async function addContentSnapshot(input: {
  channelId: string;
  followers?: number;
  periodViews?: number;
  periodLikes?: number;
  note?: string;
  recordedById: string | null;
}) {
  return db.contentChannelSnapshot.create({
    data: {
      channelId: input.channelId,
      followers: input.followers,
      periodViews: input.periodViews,
      periodLikes: input.periodLikes,
      note: input.note,
      recordedById: input.recordedById,
    },
  });
}

/** 概要画面の「要確認事項」向け。指定日数より記録が古い（または未記録の）チャンネルを返す。 */
export async function getStaleContentChannels(staleDays = 14) {
  const channels = await listChannelsWithLatest();
  const threshold = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000);

  return channels
    .filter((channel) => !channel.latest || channel.latest.capturedAt < threshold)
    .map((channel) => ({
      name: CONTENT_PLATFORM_META[channel.platform as ContentPlatformKey].label,
      lastRecordedAt: channel.latest?.capturedAt ?? null,
    }));
}
