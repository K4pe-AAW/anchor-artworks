import Link from "next/link";
import { SidebarNav } from "@/components/layout/sidebar-nav";

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 flex-col border-r border-sidebar-border bg-sidebar md:flex">
      <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-brand text-xs font-bold text-brand-foreground">
            A
          </span>
          <span className="text-sm font-semibold tracking-tight">AAW Admin</span>
        </Link>
      </div>
      <SidebarNav />
    </aside>
  );
}
