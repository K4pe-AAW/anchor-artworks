"use client";

import { useActionState, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { recordContentSnapshot, type RecordSnapshotState } from "./actions";

const initialState: RecordSnapshotState = { ok: false };

export function RecordSnapshotDialog({
  channelId,
  channelName,
  followersLabel,
  viewsLabel,
}: {
  channelId: string;
  channelName: string;
  followersLabel: string;
  viewsLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(recordContentSnapshot, initialState);

  // 送信成功を検知したらダイアログを閉じる（useEffectではなくレンダー中に状態を調整する公式パターン）。
  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.ok) {
      setOpen(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="size-3.5" />
            記録を追加
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{channelName} の数値を記録</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="channelId" value={channelId} />
          <div className="space-y-1.5">
            <Label htmlFor="followers">{followersLabel}</Label>
            <Input id="followers" name="followers" type="number" min={0} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodViews">{viewsLabel}</Label>
            <Input id="periodViews" name="periodViews" type="number" min={0} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="periodLikes">いいね・保存等</Label>
            <Input id="periodLikes" name="periodLikes" type="number" min={0} inputMode="numeric" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="note">メモ（任意）</Label>
            <Input id="note" name="note" maxLength={500} placeholder="確認した投稿名など" />
          </div>
          {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
          <DialogFooter>
            <Button type="submit" disabled={isPending} className="w-full">
              {isPending ? "記録中…" : "記録する"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
