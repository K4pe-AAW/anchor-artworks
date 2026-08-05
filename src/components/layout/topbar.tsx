import { Search } from "lucide-react";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { Input } from "@/components/ui/input";

export function Topbar({ name, email }: { name: string; email: string }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4">
      <MobileNav />
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="検索（サービス・利用者・お知らせ）"
          className="h-8 pl-8 text-sm"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <UserMenu name={name} email={email} />
      </div>
    </header>
  );
}
