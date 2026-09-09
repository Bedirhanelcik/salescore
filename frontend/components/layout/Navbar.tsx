"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Moon, Search, Sun, X } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { cn } from "@/lib/utils";
import { GlobalSearch } from "./GlobalSearch";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";

const NAV_ITEMS = [
  { href: "/dashboard", key: "nav.dashboard" },
  { href: "/crm/companies", key: "nav.crm" },
  { href: "/sales/pipeline", key: "nav.sales" },
  { href: "/analytics", key: "nav.analytics" },
  { href: "/operations/tasks", key: "nav.operations" },
  { href: "/reports", key: "nav.reports" },
  { href: "/knowledge", key: "nav.knowledge" },
];

export function Navbar() {
  const pathname = usePathname();
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const isActive = (href: string) => pathname.startsWith(href.split("/").slice(0, 2).join("/"));

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/dashboard" className="flex items-center gap-2 pr-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-brand text-sm font-bold text-white">
              S
            </div>
            <span className="text-[15px] font-bold tracking-tight text-foreground hidden sm:inline">SalesCore</span>
          </Link>

          <nav className="hidden lg:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive(item.href) ? "bg-brand-subtle text-brand" : "text-muted-foreground hover:bg-card-hover hover:text-foreground"
                )}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="ms-auto flex items-center gap-1">
            <button
              onClick={() => setSearchOpen(true)}
              className="hidden sm:flex h-9 w-56 items-center gap-2 rounded-lg border border-border px-3 text-muted-foreground hover:bg-card-hover"
            >
              <Search className="h-4 w-4" />
              <span className="text-xs">{t("common.search")}</span>
              <kbd className="ms-auto rounded border border-border px-1.5 py-0.5 text-[10px]">⌘K</kbd>
            </button>
            <button
              onClick={() => setSearchOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover sm:hidden"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover hover:text-foreground"
            >
              {theme === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
            </button>
            <NotificationsDropdown />
            <div className="ms-1">
              <UserMenu />
            </div>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="relative flex h-full w-72 flex-col bg-card p-4 shadow-2xl animate-in">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-bold text-foreground">SalesCore</span>
              <button onClick={() => setMobileOpen(false)} className="rounded-md p-1 hover:bg-card-hover">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-lg px-3 py-2.5 text-sm font-medium",
                    isActive(item.href) ? "bg-brand-subtle text-brand" : "text-foreground hover:bg-card-hover"
                  )}
                >
                  {t(item.key)}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
