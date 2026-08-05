"use client";

import { useActionState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendTestNotification, type TestNotificationState } from "./actions";

const initialState: TestNotificationState = { status: "idle" };

export function TestNotificationButton() {
  const [state, formAction, isPending] = useActionState(sendTestNotification, initialState);

  return (
    <div className="flex items-center gap-3">
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          <Send className="size-3.5" />
          {isPending ? "送信中…" : "テスト通知を送信"}
        </Button>
      </form>
      {state.status === "sent" ? (
        <p className="text-xs text-success">{state.channels?.join("・")}へ送信しました</p>
      ) : null}
      {state.status === "no_channels" ? (
        <p className="text-xs text-danger">送信先が設定されていません（下記の環境変数を確認してください）</p>
      ) : null}
    </div>
  );
}
