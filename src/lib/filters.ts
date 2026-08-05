export interface DashboardFilters {
  period: string;
  serviceId?: string;
  provider?: "STRIPE" | "PAYPAL";
  plan?: string;
}

export function currentPeriodKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function previousPeriodKey(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return date.toISOString().slice(0, 7);
}

export function periodLabel(periodKey: string): string {
  const [year, month] = periodKey.split("-").map(Number);
  return `${year}年${month}月`;
}

export function parseFilters(searchParams: Record<string, string | string[] | undefined>): DashboardFilters {
  const get = (key: string) => {
    const value = searchParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  return {
    period: get("period") || currentPeriodKey(),
    serviceId: get("service") || undefined,
    provider: (get("provider") as "STRIPE" | "PAYPAL" | undefined) || undefined,
    plan: get("plan") || undefined,
  };
}
