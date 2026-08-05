import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  JapaneseYen,
  Boxes,
  Users,
  PlaySquare,
  Megaphone,
  History,
  Activity,
  Settings,
} from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
}

// MVPのナビゲーションはこの9項目のみ。監査ログは設定内タブに配置し、独立項目にしない。
export const NAV_ITEMS: NavItem[] = [
  { title: "概要", href: "/", icon: LayoutDashboard },
  { title: "売上", href: "/revenue", icon: JapaneseYen },
  { title: "サービス", href: "/services", icon: Boxes },
  { title: "利用者・契約", href: "/users", icon: Users },
  { title: "コンテンツ", href: "/content", icon: PlaySquare },
  { title: "お知らせ", href: "/announcements", icon: Megaphone },
  { title: "配信履歴", href: "/deliveries", icon: History },
  { title: "システム", href: "/system", icon: Activity },
  { title: "設定", href: "/settings", icon: Settings },
];
