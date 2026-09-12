"use client";

import { useEffect, useState } from "react";
import { Menu, Moon, Search, Sun } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import { useTheme } from "@/lib/contexts/theme-context";
import { GlobalSearch } from "./GlobalSearch";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { UserMenu } from "./UserMenu";

export function Navbar({ onOpenMobileNav }: { onOpenMobileNav: () => void }) {
  const { t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (
        e.key === "/" &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
        <div className="flex h-14 items-center gap-2 px-4 lg:px-6">
          <button
            onClick={onOpenMobileNav}
            aria-label={t("common.menu")}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-border px-3 text-muted-foreground hover:bg-card-hover sm:max-w-xs"
          >
            <Search className="h-4 w-4" />
            <span className="hidden text-xs sm:inline">{t("common.search")}</span>
            <kbd className="ms-auto hidden rounded border border-border px-1.5 py-0.5 text-[10px] sm:inline">⌘K</kbd>
          </button>

          <div className="ms-auto flex items-center gap-1">
            <LanguageSwitcher />
            <button
              onClick={toggleTheme}
              aria-label={t("common.toggleTheme")}
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

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
