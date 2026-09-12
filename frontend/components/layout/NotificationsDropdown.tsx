"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";

import { useI18n } from "@/lib/contexts/i18n-context";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadCount,
} from "@/lib/hooks/use-notifications";
import { interpolate, relativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

const ENTITY_URL: Record<string, string> = {
  deal: "/sales/deals",
  lead: "/crm/leads",
};

const TYPE_DOT: Record<string, string> = {
  task_due: "bg-warning",
  deal_follow_up: "bg-info",
  new_lead: "bg-brand",
  deal_won: "bg-success",
  deal_lost: "bg-danger",
  target_reached: "bg-success",
  mention: "bg-brand",
};

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const router = useRouter();
  const { data: unread } = useUnreadCount();
  const { data } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const count = unread?.unread_count ?? 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t("notifications.title")}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-card-hover hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[9px] font-bold text-white rtl:right-auto rtl:left-1">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card shadow-2xl animate-in rtl:right-auto rtl:left-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">{t("notifications.title")}</span>
            {count > 0 && (
              <button onClick={() => markAllRead.mutate()} className="text-xs font-medium text-brand hover:underline">
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {(!data || data.items.length === 0) && (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">{t("notifications.empty")}</p>
            )}
            {data?.items.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markRead.mutate(n.id);
                  setOpen(false);
                  const base = n.related_entity_type ? ENTITY_URL[n.related_entity_type] : undefined;
                  if (base && n.related_entity_id) router.push(`${base}/${n.related_entity_id}`);
                }}
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-border/60 px-4 py-3 text-start last:border-b-0 hover:bg-card-hover",
                  !n.is_read && "bg-brand-subtle/30"
                )}
              >
                <span
                  className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", TYPE_DOT[n.type] ?? "bg-muted-foreground")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {t(`notifications.types.${n.type}`, n.title)}
                  </span>
                  <span className="block text-xs text-muted-foreground line-clamp-2">
                    {interpolate(t(`notifications.messages.${n.type}`, n.message), n.params ?? {})}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-subtle-foreground">{relativeTime(n.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
