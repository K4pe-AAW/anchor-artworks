import { db } from "@/lib/db";
import type { DashboardFilters } from "@/lib/filters";

export async function listPaymentTransactions(filters: DashboardFilters, query?: string) {
  const monthStart = new Date(`${filters.period}-01T00:00:00.000Z`);
  const monthEnd = new Date(monthStart);
  monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

  return db.paymentTransaction.findMany({
    where: {
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.provider ? { provider: filters.provider } : {}),
      ...(filters.plan ? { plan: filters.plan } : {}),
      occurredAt: { gte: monthStart, lt: monthEnd },
      ...(query
        ? {
            OR: [
              { emailMasked: { contains: query, mode: "insensitive" } },
              { externalPaymentId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { service: { select: { name: true } } },
    orderBy: { occurredAt: "desc" },
    take: 200,
  });
}
