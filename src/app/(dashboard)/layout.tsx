import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const session = await auth();

  // middlewareでも保護しているが、Server Componentからも直接確認する（多層防御）。
  if (!session?.user || session.expired) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          name={session.user.name ?? "管理者"}
          email={session.user.email ?? ""}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
