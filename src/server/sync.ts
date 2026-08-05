import { db } from "@/lib/db";
import { getStripeClient, isStripeConfigured } from "@/lib/stripe-client";
import { fetchPaypalTransactions, isPaypalConfigured } from "@/lib/paypal-client";
import { maskEmailFallback } from "@/lib/format";

export interface SyncResult {
  ok: boolean;
  error?: string;
  count?: number;
}

/** 当月分の payment_transactions を集計し、revenue_snapshots（サービス別・プロバイダ別・合算）を作り直す。 */
async function recomputeRevenueSnapshot(serviceId: string, periodKey: string) {
  const monthStart = new Date(`${periodKey}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  const transactions = await db.paymentTransaction.findMany({
    where: { serviceId, occurredAt: { gte: monthStart, lt: monthEnd } },
  });

  const providers: ("STRIPE" | "PAYPAL" | null)[] = ["STRIPE", "PAYPAL", null];
  for (const provider of providers) {
    const rows = provider ? transactions.filter((t) => t.provider === provider) : transactions;
    const grossRevenue = rows.reduce((sum, t) => sum + t.grossAmount, 0);
    const feeTotal = rows.reduce((sum, t) => sum + t.feeAmount, 0);
    const refundTotal = rows.reduce((sum, t) => sum + t.refundAmount, 0);
    const netRevenue = rows.reduce((sum, t) => sum + t.netAmount, 0);

    const existing = await db.revenueSnapshot.findFirst({ where: { serviceId, periodKey, provider } });
    if (existing) {
      await db.revenueSnapshot.update({
        where: { id: existing.id },
        data: { grossRevenue, feeTotal, refundTotal, netRevenue, syncedAt: new Date(), syncError: null },
      });
    } else {
      await db.revenueSnapshot.create({
        data: { serviceId, periodKey, provider, grossRevenue, feeTotal, refundTotal, netRevenue },
      });
    }
  }
}

async function markServiceSyncResult(serviceId: string, error: string | null) {
  await db.service.update({
    where: { id: serviceId },
    data: { lastSyncedAt: new Date(), lastSyncError: error },
  });
}

export async function syncStripeRevenue(serviceId: string): Promise<SyncResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "STRIPE_SECRET_KEYが設定されていません" };
  }
  const stripe = getStripeClient();
  if (!stripe) {
    return { ok: false, error: "Stripeクライアントの初期化に失敗しました" };
  }

  try {
    const since = Math.floor(Date.now() / 1000) - 35 * 24 * 60 * 60;
    const charges = await stripe.charges.list({
      created: { gte: since },
      limit: 100,
      expand: ["data.balance_transaction"],
    });

    let count = 0;
    for (const charge of charges.data) {
      const balanceTx =
        typeof charge.balance_transaction === "object" ? charge.balance_transaction : null;
      const grossAmount = charge.amount;
      const feeAmount = balanceTx?.fee ?? 0;
      const refundAmount = charge.amount_refunded ?? 0;
      const netAmount = grossAmount - feeAmount - refundAmount;
      const email = charge.billing_details?.email ?? charge.receipt_email ?? null;

      await db.paymentTransaction.upsert({
        where: { provider_externalPaymentId: { provider: "STRIPE", externalPaymentId: charge.id } },
        update: {
          grossAmount,
          feeAmount,
          refundAmount,
          netAmount,
          status: charge.refunded ? "refunded" : charge.status,
          rawResponse: JSON.parse(JSON.stringify(charge)),
          syncedAt: new Date(),
        },
        create: {
          serviceId,
          provider: "STRIPE",
          externalPaymentId: charge.id,
          emailMasked: email ? maskEmailFallback(email) : "-",
          plan: (charge.metadata?.plan as string | undefined) ?? null,
          grossAmount,
          feeAmount,
          refundAmount,
          netAmount,
          currency: charge.currency,
          status: charge.refunded ? "refunded" : charge.status,
          occurredAt: new Date(charge.created * 1000),
          rawResponse: JSON.parse(JSON.stringify(charge)),
        },
      });
      count++;
    }

    const periodKey = new Date().toISOString().slice(0, 7);
    await recomputeRevenueSnapshot(serviceId, periodKey);
    await markServiceSyncResult(serviceId, null);
    return { ok: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    await markServiceSyncResult(serviceId, message);
    return { ok: false, error: message };
  }
}

export async function syncPaypalRevenue(serviceId: string): Promise<SyncResult> {
  if (!isPaypalConfigured()) {
    return { ok: false, error: "PayPalの認証情報が設定されていません" };
  }

  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    const transactions = await fetchPaypalTransactions(startDate, endDate);

    let count = 0;
    for (const tx of transactions) {
      const info = tx.transaction_info;
      if (!info?.transaction_id || !info.transaction_amount) continue;

      const gross = Math.round(Number(info.transaction_amount.value) * 100);
      const fee = Math.round(Number(info.fee_amount?.value ?? "0") * 100) * -1; // PayPalの手数料は負値で返る
      const isRefund = (info.transaction_status ?? "").toUpperCase() === "D" || gross < 0;
      const grossAmount = Math.abs(gross);
      const feeAmount = Math.abs(fee);
      const refundAmount = isRefund ? grossAmount : 0;
      const netAmount = grossAmount - feeAmount - refundAmount;
      const email = tx.payer_info?.email_address ?? null;

      await db.paymentTransaction.upsert({
        where: {
          provider_externalPaymentId: { provider: "PAYPAL", externalPaymentId: info.transaction_id },
        },
        update: {
          grossAmount,
          feeAmount,
          refundAmount,
          netAmount,
          status: isRefund ? "refunded" : "succeeded",
          rawResponse: JSON.parse(JSON.stringify(tx)),
          syncedAt: new Date(),
        },
        create: {
          serviceId,
          provider: "PAYPAL",
          externalPaymentId: info.transaction_id,
          emailMasked: email ? maskEmailFallback(email) : "-",
          plan: null,
          grossAmount,
          feeAmount,
          refundAmount,
          netAmount,
          currency: info.transaction_amount.currency_code,
          status: isRefund ? "refunded" : "succeeded",
          occurredAt: info.transaction_initiation_date
            ? new Date(info.transaction_initiation_date)
            : new Date(),
          rawResponse: JSON.parse(JSON.stringify(tx)),
        },
      });
      count++;
    }

    const periodKey = new Date().toISOString().slice(0, 7);
    await recomputeRevenueSnapshot(serviceId, periodKey);
    await markServiceSyncResult(serviceId, null);
    return { ok: true, count };
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラーが発生しました";
    await markServiceSyncResult(serviceId, message);
    return { ok: false, error: message };
  }
}
