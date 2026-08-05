import { db } from "@/lib/db";

export async function listAnnouncements() {
  return db.announcement.findMany({
    include: { createdBy: { select: { displayName: true } }, deliveries: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAnnouncementDetail(id: string) {
  return db.announcement.findUnique({
    where: { id },
    include: {
      createdBy: { select: { displayName: true } },
      audiences: { include: { service: { select: { name: true } } } },
      deliveries: true,
    },
  });
}
