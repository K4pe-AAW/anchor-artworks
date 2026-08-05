"use client";

import { useActionState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateAiInsight, type GenerateInsightState } from "./actions";

const initialState: GenerateInsightState = { status: "idle" };

export function AiInsightCard({
  periodKey,
  configured,
  initialContent,
  initialCreatedAt,
}: {
  periodKey: string;
  configured: boolean;
  initialContent: string | null;
  initialCreatedAt: string | null;
}) {
  const boundAction = generateAiInsight.bind(null, periodKey);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  const content = state.status === "done" ? state.content : initialContent;
  const createdAt = state.status === "done" ? state.createdAt : initialCreatedAt;

  if (!configured) {
    return (
      <div className="rounded-md border border-border p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-muted-foreground" />
          AI売上戦略アドバイス
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          ANTHROPIC_API_KEYが未設定のため、この機能は利用できません（未設定）。
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 text-muted-foreground" />
          AI売上戦略アドバイス
        </div>
        <form action={formAction}>
          <Button type="submit" variant="outline" size="sm" disabled={isPending}>
            {isPending ? "分析中…" : content ? "再分析する" : "AIに分析してもらう"}
          </Button>
        </form>
      </div>

      {state.status === "error" ? (
        <p className="mt-3 text-xs text-danger">生成に失敗しました: {state.error}</p>
      ) : null}
      {state.status === "unauthorized" ? (
        <p className="mt-3 text-xs text-danger">セッションが切れています。再度ログインしてください。</p>
      ) : null}

      {content ? (
        <div className="mt-3 space-y-1">
          {createdAt ? (
            <p className="text-xs text-muted-foreground">
              生成日時: {new Date(createdAt).toLocaleString("ja-JP")}
            </p>
          ) : null}
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">
          まだ生成されていません。「AIに分析してもらう」を押すと、当月のKPIをもとにClaudeが施策案を提示します。
        </p>
      )}
    </div>
  );
}
