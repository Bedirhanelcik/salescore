"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronsLeft,
  ChevronsRight,
  LayoutDashboard,
  Settings,
  Users2,
  X,
  ClipboardList,
} from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard", icon: LayoutDashboard },
  { href: "/crm/companies", key: "nav.crm", icon: Users2 },
  { href: "/sales/pipeline", key: "nav.sales", icon: Briefcase },
  { href: "/analytics", key: "nav.analytics", icon: BarChart3 },
  { href: "/reports", key: "nav.reports", icon: ClipboardList },
  { href: "/operations/tasks", key: "nav.operations", icon: ClipboardList },
  { href: "/knowledge", key: "nav.knowledge", icon: BookOpen },
];

function isActive(pathname: string, href: string) {
  return pathname.startsWith(href.split("/").slice(0, 2).join("/"));
}

export function SidebarContent({ collapsed, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2.5 py-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? t(item.key) : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
                collapsed && "justify-center",
                active
                  ? "bg-brand-subtle text-brand"
                  : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {!collapsed && <span className="truncate">{t(item.key)}</span>}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border px-2.5 py-2.5">
        <Link
          href="/settings"
          onClick={onNavigate}
          title={collapsed ? t("nav.settings") : undefined}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors",
            collapsed && "justify-center",
            isActive(pathname, "/settings")
              ? "bg-brand-subtle text-brand"
              : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
          )}
        >
          <Settings className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && <span className="truncate">{t("nav.settings")}</span>}
        </Link>
      </div>
    </>
  );
}

export function Sidebar({ collapsed, onToggleCollapse }: { collapsed: boolean; onToggleCollapse: () => void }) {
  return (
    <aside
      className={cn(
        "sticky top-0 hidden h-screen shrink-0 flex-col border-e border-border bg-card transition-[width] duration-200 lg:flex",
        collapsed ? "w-[72px]" : "w-60"
      )}
    >
      <div
        className={cn("flex h-14 items-center gap-2 border-b border-border px-3.5", collapsed && "justify-center px-0")}
      >
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
          S
        </div>
        {!collapsed && <span className="text-[15px] font-bold tracking-tight text-foreground">SalesCore</span>}
      </div>
      <SidebarContent collapsed={collapsed} />
      <button
        onClick={onToggleCollapse}
        className="flex h-10 items-center justify-center border-t border-border text-muted-foreground hover:bg-card-hover hover:text-foreground"
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </button>
    </aside>
  );
}

export function MobileSidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative flex h-full w-72 flex-col bg-card shadow-2xl animate-in">
        <div className="flex h-14 items-center justify-between border-b border-border px-3.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
              S
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground">SalesCore</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-card-hover">
            <X className="h-5 w-5" />
          </button>
        </div>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
