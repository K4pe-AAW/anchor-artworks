"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currentPeriodKey, periodLabel, previousPeriodKey } from "@/lib/filters";

interface FilterBarProps {
  services: { id: string; name: string }[];
  showProvider?: boolean;
  showPlan?: boolean;
}

const PLAN_OPTIONS = [
  { value: "trial", label: "Trial" },
  { value: "free", label: "Free" },
  { value: "personal", label: "Personal" },
  { value: "pro", label: "Pro" },
];

const PROVIDER_ITEMS: Record<string, string> = {
  all: "すべての決済会社",
  STRIPE: "Stripe",
  PAYPAL: "PayPal",
};

export function FilterBar({ services, showProvider = true, showPlan = true }: FilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const period = searchParams.get("period") || currentPeriodKey();
  const thisMonth = currentPeriodKey();
  const lastMonth = previousPeriodKey(thisMonth);

  const periodItems: Record<string, string> = {
    [thisMonth]: `${periodLabel(thisMonth)}（今月）`,
    [lastMonth]: `${periodLabel(lastMonth)}（先月）`,
  };
  const serviceItems: Record<string, string> = {
    all: "すべてのサービス",
    ...Object.fromEntries(services.map((s) => [s.id, s.name])),
  };
  const planItems: Record<string, string> = {
    all: "すべてのプラン",
    ...Object.fromEntries(PLAN_OPTIONS.map((p) => [p.value, p.label])),
  };

  function updateParam(key: string, value: string | null | undefined) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/30 px-4 py-2 sm:px-6">
      <Select items={periodItems} value={period} onValueChange={(v) => updateParam("period", v)}>
        <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={thisMonth}>{periodItems[thisMonth]}</SelectItem>
          <SelectItem value={lastMonth}>{periodItems[lastMonth]}</SelectItem>
        </SelectContent>
      </Select>

      <Select
        items={serviceItems}
        value={searchParams.get("service") || "all"}
        onValueChange={(v) => updateParam("service", v)}
      >
        <SelectTrigger size="sm" className="h-8 w-[160px] text-xs">
          <SelectValue placeholder="サービス" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">すべてのサービス</SelectItem>
          {services.map((service) => (
            <SelectItem key={service.id} value={service.id}>
              {service.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {showProvider ? (
        <Select
          items={PROVIDER_ITEMS}
          value={searchParams.get("provider") || "all"}
          onValueChange={(v) => updateParam("provider", v)}
        >
          <SelectTrigger size="sm" className="h-8 w-[140px] text-xs">
            <SelectValue placeholder="決済会社" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての決済会社</SelectItem>
            <SelectItem value="STRIPE">Stripe</SelectItem>
            <SelectItem value="PAYPAL">PayPal</SelectItem>
          </SelectContent>
        </Select>
      ) : null}

      {showPlan ? (
        <Select
          items={planItems}
          value={searchParams.get("plan") || "all"}
          onValueChange={(v) => updateParam("plan", v)}
        >
          <SelectTrigger size="sm" className="h-8 w-[120px] text-xs">
            <SelectValue placeholder="プラン" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべてのプラン</SelectItem>
            {PLAN_OPTIONS.map((plan) => (
              <SelectItem key={plan.value} value={plan.value}>
                {plan.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}
