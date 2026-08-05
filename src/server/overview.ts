import { db } from "@/lib/db";
import type { DashboardFilters } from "@/lib/filters";
import { periodLabel, previousPeriodKey } from "@/lib/filters";

export async function getServiceOptions() {
  return db.service.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

/** 概要画面の売上推移グラフ用。指定した期間を起点に過去6ヶ月分の純売上を月次で返す。 */
export async function getRevenueTrend(filters: DashboardFilters) {
  const periodKeys: string[] = [filters.period];
  for (let i = 1; i < 6; i++) {
    periodKeys.unshift(previousPeriodKey(periodKeys[0]));
  }

  const snapshots = await db.revenueSnapshot.findMany({
    where: {
      periodKey: { in: periodKeys },
      provider: null,
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    },
  });

  return periodKeys.map((key) => {
    const netRevenue = snapshots
      .filter((s) => s.periodKey === key)
      .reduce((total, s) => total + s.netRevenue, 0);
    return { period: periodLabel(key).replace(/^\d{4}年/, ""), netRevenue };
  });
}

export async function getOverviewData(filters: DashboardFilters) {
  const serviceWhere = filters.serviceId ? { serviceId: filters.serviceId } : {};
  const previousPeriod = previousPeriodKey(filters.period);

  const [
    services,
    revenueSnapshots,
    previousRevenueSnapshots,
    activeSubscriptions,
    userCountsByService,
    jobRuns,
    webhookEvents,
    users,
  ] = await Promise.all([
    db.service.findMany({ orderBy: { name: "asc" } }),
    db.revenueSnapshot.findMany({
      where: { periodKey: filters.period, provider: filters.provider ?? null, ...serviceWhere },
    }),
    db.revenueSnapshot.findMany({
      where: { periodKey: previousPeriod, provider: filters.provider ?? null, ...serviceWhere },
    }),
    db.subscriptionSnapshot.findMany({
      where: {
        status: "active",
        ...serviceWhere,
        ...(filters.plan ? { plan: filters.plan } : {}),
      },
    }),
    db.serviceUserSnapshot.groupBy({
      by: ["serviceId"],
      where: serviceWhere,
      _count: { _all: true },
    }),
    db.jobRun.findMany({
      where: { ...serviceWhere, startedAt: { gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7) } },
      orderBy: { startedAt: "desc" },
      take: 50,
    }),
    db.webhookEvent.findMany({ where: serviceWhere }),
    db.serviceUserSnapshot.findMany({
      where: { ...serviceWhere, ...(filters.plan ? { currentPlan: filters.plan } : {}) },
      select: { contractStatus: true, registeredAt: true },
    }),
  ]);

  const grossRevenue = sum(revenueSnapshots, "grossRevenue");
  const feeTotal = sum(revenueSnapshots, "feeTotal");
  const refundTotal = sum(revenueSnapshots, "refundTotal");
  const netRevenue = sum(revenueSnapshots, "netRevenue");
  const mrr = sum(revenueSnapshots, "mrr");
  const previousNetRevenue = sum(previousRevenueSnapshots, "netRevenue");

  const newContracts = sum(revenueSnapshots, "newContracts");
  const canceledContracts = sum(revenueSnapshots, "canceledContracts");

  const jobSuccess = jobRuns.filter((j) => j.status === "SUCCESS").length;
  const jobFailure = jobRuns.filter((j) => j.status === "FAILURE").length;

  const stripeWebhook = webhookEvents.find((w) => w.provider === "STRIPE");
  const paypalWebhook = webhookEvents.find((w) => w.provider === "PAYPAL");

  const hasSyncError = revenueSnapshots.some((r) => r.syncError);
  const latestSyncedAt = revenueSnapshots.reduce<Date | null>((latest, r) => {
    if (!latest || r.syncedAt > latest) return r.syncedAt;
    return latest;
  }, null);

  const serviceDegraded = services.filter((s) => s.status !== "OPERATIONAL");

  return {
    services,
    kpi: {
      grossRevenue,
      feeTotal,
      refundTotal,
      netRevenue,
      previousNetRevenue,
      mrr,
      activeSubscribers: activeSubscriptions.length,
      newContracts,
      canceledContracts,
    },
    usersByService: userCountsByService.map((row) => ({
      serviceId: row.serviceId,
      count: row._count._all,
    })),
    jobs: { success: jobSuccess, failure: jobFailure, total: jobRuns.length },
    webhooks: { stripe: stripeWebhook, paypal: paypalWebhook },
    sync: { lastSyncedAt: latestSyncedAt, hasError: hasSyncError },
    serviceDegraded,
    totalUsers: users.length,
  };
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T): number {
  return rows.reduce((total, row) => total + (Number(row[key]) || 0), 0);
}
