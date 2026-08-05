import { db } from "@/lib/db";

export async function getSystemHealth() {
  const [services, webhookEvents, jobRuns, integrations] = await Promise.all([
    db.service.findMany({ orderBy: { name: "asc" } }),
    db.webhookEvent.findMany({ include: { service: { select: { name: true } } } }),
    db.jobRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 20,
      include: { service: { select: { name: true } } },
    }),
    db.serviceIntegration.findMany({
      where: { kind: "SMTP" },
      include: { service: { select: { name: true } } },
    }),
  ]);

  const latestJobByName = new Map<string, (typeof jobRuns)[number]>();
  for (const job of jobRuns) {
    const key = `${job.serviceId}:${job.jobName}`;
    if (!latestJobByName.has(key)) {
      latestJobByName.set(key, job);
    }
  }

  return {
    services,
    webhookEvents,
    latestJobs: Array.from(latestJobByName.values()),
    smtpIntegrations: integrations,
  };
}
