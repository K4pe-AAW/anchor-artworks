"use client";

import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { syncServiceRevenue, type SyncState } from "./actions";

const initialState: SyncState = { status: "idle" };

export function SyncButton({ serviceId, slug }: { serviceId: string; slug: string }) {
  const boundAction = syncServiceRevenue.bind(null, serviceId, slug);
  const [state, formAction, isPending] = useActionState(boundAction, initialState);

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          <RefreshCw className={`size-3.5 ${isPending ? "animate-spin" : ""}`} />
          {isPending ? "同期中…" : "今すぐ同期"}
        </Button>
      </form>
      {state.status === "done" ? (
        <div className="text-right text-xs">
          <p className={state.stripe?.ok ? "text-success" : "text-danger"}>
            Stripe: {state.stripe?.ok ? `${state.stripe.count}件取得` : state.stripe?.error}
          </p>
          <p className={state.paypal?.ok ? "text-success" : "text-danger"}>
            PayPal: {state.paypal?.ok ? `${state.paypal.count}件取得` : state.paypal?.error}
          </p>
        </div>
      ) : null}
    </div>
  );
}
