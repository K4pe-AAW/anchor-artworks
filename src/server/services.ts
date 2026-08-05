import { db } from "@/lib/db";
import { isStripeConfigured } from "@/lib/stripe-client";
import { isPaypalConfigured } from "@/lib/paypal-client";

/** DB上のダミー設定値ではなく、実際の環境変数の有無で連携状態を上書きする。 */
function withLiveIntegrationStatus<
  T extends { kind: string; isConfigured: boolean; maskedValueHint: string | null },
>(integrations: T[]): T[] {
  return integrations.map((integration) => {
    if (integration.kind === "STRIPE") {
      return { ...integration, isConfigured: isStripeConfigured(), maskedValueHint: null };
    }
    if (integration.kind === "PAYPAL") {
      return { ...integration, isConfigured: isPaypalConfigured(), maskedValueHint: null };
    }
    return integration;
  });
}

export async function listServicesWithSummary() {
  const services = await db.service.findMany({ orderBy: { name: "asc" } });

  return Promise.all(
    services.map(async (service) => {
      const [userCount, activeSubCount, revenue, integrations, jobRuns] = await Promise.all([
        db.serviceUserSnapshot.count({ where: { serviceId: service.id } }),
        db.subscriptionSnapshot.count({ where: { serviceId: service.id, status: "active" } }),
        db.revenueSnapshot.findFirst({
          where: { serviceId: service.id, provider: null },
          orderBy: { periodKey: "desc" },
        }),
        db.serviceIntegration.findMany({ where: { serviceId: service.id } }).then(withLiveIntegrationStatus),
        db.jobRun.findMany({
          where: { serviceId: service.id },
          orderBy: { startedAt: "desc" },
          take: 5,
        }),
      ]);

      const webhookIntegrations = integrations.filter(
        (i) => i.kind === "STRIPE" || i.kind === "PAYPAL",
      );
      const webhookStatus: "success" | "warning" | "neutral" =
        webhookIntegrations.length === 0
          ? "neutral"
          : webhookIntegrations.every((i) => i.lastStatus === "OK")
            ? "success"
            : "warning";

      return {
        service,
        userCount,
        activeSubCount,
        currentMonthRevenue: revenue?.netRevenue ?? 0,
        integrations,
        recentJobRuns: jobRuns,
        webhookStatus,
      };
    }),
  );
}

export async function getServiceDetail(slug: string) {
  const service = await db.service.findUnique({ where: { slug } });
  if (!service) return null;

  const [planCounts, usage, jobRuns, integrations, revenue] = await Promise.all([
    db.serviceUserSnapshot.groupBy({
      by: ["currentPlan"],
      where: { serviceId: service.id },
      _count: { _all: true },
    }),
    db.serviceUserSnapshot.aggregate({
      where: { serviceId: service.id },
      _sum: { currentMonthUsage: true },
    }),
    db.jobRun.findMany({
      where: { serviceId: service.id },
      orderBy: { startedAt: "desc" },
      take: 20,
    }),
    db.serviceIntegration.findMany({ where: { serviceId: service.id } }).then(withLiveIntegrationStatus),
    db.revenueSnapshot.findFirst({
      where: { serviceId: service.id, provider: null },
      orderBy: { periodKey: "desc" },
    }),
  ]);

  return { service, planCounts, usage, jobRuns, integrations, revenue };
}
