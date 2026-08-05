import { db } from "@/lib/db";

export async function listDeliveries() {
  return db.notificationDelivery.findMany({
    include: { announcement: { include: { createdBy: { select: { displayName: true } } } } },
    orderBy: { startedAt: "desc" },
    take: 100,
  });
}
