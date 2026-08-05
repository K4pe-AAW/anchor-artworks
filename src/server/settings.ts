import { db } from "@/lib/db";

export async function listAdministrators() {
  return db.administrator.findMany({ orderBy: { createdAt: "asc" } });
}

export async function listIntegrations() {
  return db.serviceIntegration.findMany({
    include: { service: { select: { name: true } } },
    orderBy: [{ service: { name: "asc" } }, { kind: "asc" }],
  });
}

export async function listAuditLogs(limit = 100) {
  return db.adminAuditLog.findMany({
    include: { administrator: { select: { displayName: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
