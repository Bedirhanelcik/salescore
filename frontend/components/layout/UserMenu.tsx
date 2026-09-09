"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";

import { useAuth } from "@/lib/contexts/auth-context";
import { useI18n } from "@/lib/contexts/i18n-context";
import { Avatar } from "@/components/ui/Avatar";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { t } = useI18n();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-card-hover">
        <Avatar name={user.full_name} color={user.avatar_color} size="sm" />
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-2xl animate-in rtl:right-auto rtl:left-0">
          <div className="flex items-center gap-2.5 px-2.5 py-2">
            <Avatar name={user.full_name} color={user.avatar_color} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user.full_name}</p>
              <p className="truncate text-xs text-muted-foreground">{t(`roles.${user.role}`)}</p>
            </div>
          </div>
          <div className="my-1 h-px bg-border" />
          <div className="px-2.5 py-1.5 text-xs text-muted-foreground flex items-center gap-2">
            <UserIcon className="h-3.5 w-3.5" />
            {user.email}
          </div>
          <div className="my-1 h-px bg-border" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-danger hover:bg-danger-subtle"
          >
            <LogOut className="h-4 w-4" />
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}
