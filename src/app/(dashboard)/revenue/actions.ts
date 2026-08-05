"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { generateRevenueInsight } from "@/server/ai-insights";
import { recordAuditLog } from "@/lib/audit";

export interface GenerateInsightState {
  status: "idle" | "done" | "error" | "unauthorized";
  content?: string;
  createdAt?: string;
  error?: string;
}

export async function generateAiInsight(
  periodKey: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: GenerateInsightState,
): Promise<GenerateInsightState> {
  const session = await auth();
  if (!session?.user || session.expired) {
    return { status: "unauthorized" };
  }

  const result = await generateRevenueInsight(periodKey, session.user.id);
  if (!result.ok) {
    return { status: "error", error: result.error };
  }

  await recordAuditLog({
    administratorId: session.user.id,
    action: "ai_insight.generated",
    targetType: "ai_insight",
    targetId: result.insight.id,
    detail: { periodKey },
  });

  revalidatePath("/revenue");
  return {
    status: "done",
    content: result.insight.content,
    createdAt: result.insight.createdAt.toISOString(),
  };
}
