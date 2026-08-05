import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumb?: BreadcrumbItem[];
  actions?: ReactNode;
}

export function PageHeader({ title, description, breadcrumb, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="min-w-0">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav className="mb-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            {breadcrumb.map((item, index) => (
              <span key={`${item.label}-${index}`} className="flex items-center gap-1">
                {index > 0 ? <ChevronRight className="size-3" /> : null}
                {item.href ? (
                  <Link href={item.href} className="hover:text-foreground">
                    {item.label}
                  </Link>
                ) : (
                  <span>{item.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
