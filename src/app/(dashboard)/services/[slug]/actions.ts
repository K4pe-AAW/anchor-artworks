"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { syncPaypalRevenue, syncStripeRevenue } from "@/server/sync";
import { recordAuditLog } from "@/lib/audit";

export interface SyncState {
  status: "idle" | "done" | "unauthorized";
  stripe?: { ok: boolean; error?: string; count?: number };
  paypal?: { ok: boolean; error?: string; count?: number };
}

export async function syncServiceRevenue(
  serviceId: string,
  slug: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  prevState: SyncState,
): Promise<SyncState> {
  const session = await auth();
  if (!session?.user || session.expired) {
    return { status: "unauthorized" };
  }

  const [stripe, paypal] = await Promise.all([
    syncStripeRevenue(serviceId),
    syncPaypalRevenue(serviceId),
  ]);

  await recordAuditLog({
    administratorId: session.user.id,
    action: "service.revenue_sync",
    targetType: "service",
    targetId: serviceId,
    detail: JSON.parse(JSON.stringify({ stripe, paypal })),
  });

  revalidatePath(`/services/${slug}`);
  revalidatePath("/revenue");
  revalidatePath("/");
  return { status: "done", stripe, paypal };
}
