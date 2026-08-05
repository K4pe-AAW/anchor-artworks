import { db } from "@/lib/db";

export interface UserListFilters {
  serviceId?: string;
  plan?: string;
  status?: string;
}

export async function listServiceUsers(filters: UserListFilters) {
  return db.serviceUserSnapshot.findMany({
    where: {
      ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
      ...(filters.plan ? { currentPlan: filters.plan } : {}),
      ...(filters.status ? { contractStatus: filters.status } : {}),
    },
    include: { service: { select: { name: true } } },
    orderBy: { registeredAt: "desc" },
    take: 200,
  });
}

export async function getServiceUserDetail(id: string) {
  return db.serviceUserSnapshot.findUnique({
    where: { id },
    include: {
      service: true,
      subscriptionSnapshots: { orderBy: { syncedAt: "desc" } },
    },
  });
}
