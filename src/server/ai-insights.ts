import { db } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic-client";
import { previousPeriodKey, periodLabel } from "@/lib/filters";

interface RevenueKpiContext {
  periodKey: string;
  periodLabel: string;
  currentMonth: {
    netRevenue: number;
    grossRevenue: number;
    mrr: number;
    activeSubscribers: number;
    newContracts: number;
    canceledContracts: number;
  };
  sixMonthTrend: { period: string; netRevenue: number }[];
  byService: { name: string; netRevenue: number; activeSubscribers: number }[];
}

async function gatherRevenueKpiContext(periodKey: string): Promise<RevenueKpiContext> {
  const periodKeys: string[] = [periodKey];
  for (let i = 1; i < 6; i++) {
    periodKeys.unshift(previousPeriodKey(periodKeys[0]));
  }

  const [services, snapshots, trendSnapshots, activeSubscriptions] = await Promise.all([
    db.service.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.revenueSnapshot.findMany({ where: { periodKey, provider: null } }),
    db.revenueSnapshot.findMany({ where: { periodKey: { in: periodKeys }, provider: null } }),
    db.subscriptionSnapshot.findMany({ where: { status: "active" }, select: { serviceId: true } }),
  ]);

  const sum = (key: "netRevenue" | "grossRevenue" | "mrr" | "newContracts" | "canceledContracts") =>
    snapshots.reduce((total, s) => total + (s[key] ?? 0), 0);

  const sixMonthTrend = periodKeys.map((key) => ({
    period: periodLabel(key),
    netRevenue: trendSnapshots.filter((s) => s.periodKey === key).reduce((t, s) => t + s.netRevenue, 0),
  }));

  const byService = services.map((service) => ({
    name: service.name,
    netRevenue: snapshots
      .filter((s) => s.serviceId === service.id)
      .reduce((t, s) => t + s.netRevenue, 0),
    activeSubscribers: activeSubscriptions.filter((a) => a.serviceId === service.id).length,
  }));

  return {
    periodKey,
    periodLabel: periodLabel(periodKey),
    currentMonth: {
      netRevenue: sum("netRevenue"),
      grossRevenue: sum("grossRevenue"),
      mrr: sum("mrr"),
      activeSubscribers: activeSubscriptions.length,
      newContracts: sum("newContracts"),
      canceledContracts: sum("canceledContracts"),
    },
    sixMonthTrend,
    byService,
  };
}

function buildPrompt(context: RevenueKpiContext): string {
  return `あなたはAnchor Art Worksの経営アドバイザーです。以下は運営する複数サービスの${context.periodLabel}時点の売上KPIです（単位: 円、参考値）。

## 当月サマリー
- 純売上: ${context.currentMonth.netRevenue.toLocaleString("ja-JP")}円
- 総売上: ${context.currentMonth.grossRevenue.toLocaleString("ja-JP")}円
- MRR: ${context.currentMonth.mrr.toLocaleString("ja-JP")}円
- 有料契約者数: ${context.currentMonth.activeSubscribers}
- 新規契約: ${context.currentMonth.newContracts} / 解約: ${context.currentMonth.canceledContracts}

## 過去6ヶ月の純売上推移
${context.sixMonthTrend.map((t) => `- ${t.period}: ${t.netRevenue.toLocaleString("ja-JP")}円`).join("\n")}

## サービス別（当月・純売上）
${context.byService.map((s) => `- ${s.name}: ${s.netRevenue.toLocaleString("ja-JP")}円（有料契約者${s.activeSubscribers}名）`).join("\n")}

上記データに基づき、売上を伸ばすための具体的なアドバイスを日本語で提示してください。以下の形式に従ってください:
1. 現状の傾向について2〜3文で簡潔に分析する
2. 優先度の高い施策を3〜5個、箇条書きで提示する（各項目は1〜2文、具体的な行動に落とし込む）
3. リスクや注意点があれば1〜2文で触れる

データにない情報を断定的に語らず、推測は「〜と考えられます」のように明示してください。Markdownの見出し(#)は使わず、上記の番号付き構成のみで出力してください。`;
}

/** AI売上戦略アドバイスを生成しDBへ保存する（都度APIを呼ぶため、ボタン押下時のオンデマンド実行を想定）。 */
export async function generateRevenueInsight(
  periodKey: string,
  administratorId: string | null,
): Promise<{ ok: true; insight: { id: string; content: string; createdAt: Date } } | { ok: false; error: string }> {
  const client = getAnthropicClient();
  if (!client) {
    return { ok: false, error: "ANTHROPIC_API_KEYが設定されていません" };
  }

  try {
    const context = await gatherRevenueKpiContext(periodKey);
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      messages: [{ role: "user", content: buildPrompt(context) }],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const content = textBlock?.type === "text" ? textBlock.text : "";
    if (!content) {
      return { ok: false, error: "AIからの応答にテキストが含まれていませんでした" };
    }

    const insight = await db.aiInsight.create({
      data: {
        periodKey,
        content,
        promptContext: JSON.parse(JSON.stringify(context)),
        generatedById: administratorId,
      },
    });

    return { ok: true, insight };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    return { ok: false, error: message };
  }
}

export async function getLatestInsight(periodKey: string) {
  return db.aiInsight.findFirst({
    where: { periodKey },
    orderBy: { createdAt: "desc" },
  });
}
