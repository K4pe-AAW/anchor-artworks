import { format, getISOWeek, startOfISOWeek } from "date-fns";

export type Granularity = "week" | "month";

/** 週単位のバケットキー（例: 2026-W32、月曜始まり） */
export function weekBucketKey(date: Date): string {
  const monday = startOfISOWeek(date);
  const week = getISOWeek(date);
  return `${monday.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function monthBucketKey(date: Date): string {
  return format(date, "yyyy-MM");
}

export function bucketKey(date: Date, granularity: Granularity): string {
  return granularity === "week" ? weekBucketKey(date) : monthBucketKey(date);
}

/** バケットキーからチャート表示用の短いラベルを作る（例: "8/3週" / "8月"） */
export function bucketLabel(key: string, granularity: Granularity): string {
  if (granularity === "month") {
    const [, month] = key.split("-");
    return `${Number(month)}月`;
  }
  const [yearStr, weekStr] = key.split("-W");
  const year = Number(yearStr);
  const week = Number(weekStr);
  // ISO週の月曜日を概算で求める（表示用途のみなので厳密なISO 8601計算は行わない）
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = (jan4.getUTCDay() + 6) % 7; // 月曜=0
  const week1Monday = new Date(jan4);
  week1Monday.setUTCDate(jan4.getUTCDate() - jan4Weekday);
  const monday = new Date(week1Monday);
  monday.setUTCDate(week1Monday.getUTCDate() + (week - 1) * 7);
  return `${monday.getUTCMonth() + 1}/${monday.getUTCDate()}週`;
}

/** 直近N個分のバケットキーを古い順で返す */
export function recentBucketKeys(count: number, granularity: Granularity, from = new Date()): string[] {
  const keys: string[] = [];
  const cursor = new Date(from);
  for (let i = 0; i < count; i++) {
    keys.unshift(bucketKey(cursor, granularity));
    if (granularity === "week") {
      cursor.setDate(cursor.getDate() - 7);
    } else {
      cursor.setMonth(cursor.getMonth() - 1);
    }
  }
  return keys;
}
