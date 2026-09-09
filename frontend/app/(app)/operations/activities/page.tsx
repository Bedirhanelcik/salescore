"use client";

import { useState } from "react";
import { Activity as ActivityIcon, Calendar, Mail, MessageSquare, Phone, Plus, Presentation, FileText, CheckSquare } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ActivityFormModal } from "@/components/operations/ActivityFormModal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useActivities } from "@/lib/hooks/use-activities";
import { formatDateTime } from "@/lib/utils";

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  call: Phone,
  email: Mail,
  meeting: Calendar,
  note: MessageSquare,
  follow_up: CheckSquare,
  demo: Presentation,
  proposal: FileText,
  task: CheckSquare,
};

export default function ActivitiesPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useActivities({ page, page_size: 20 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("operations.addActivity")}
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={ActivityIcon} title={t("operations.noActivities")} actionLabel={t("operations.addActivity")} onAction={() => setModalOpen(true)} />
        ) : (
          <CardContent className="pt-5 space-y-1">
            {data.items.map((activity) => {
              const Icon = TYPE_ICON[activity.type] ?? ActivityIcon;
              return (
                <div key={activity.id} className="flex items-start gap-3 border-b border-border/60 py-3 last:border-0">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <span className="shrink-0 text-xs text-subtle-foreground">{formatDateTime(activity.activity_date, locale)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {t(`operations.activityTypes.${activity.type}`)}
                      {activity.company && ` · ${activity.company.name}`}
                    </p>
                  </div>
                  {activity.owner && <Avatar name={activity.owner.full_name} color={activity.owner.avatar_color} size="xs" />}
                </div>
              );
            })}
          </CardContent>
        )}
        {data && data.total > 0 && (
          <Pagination page={data.page} totalPages={data.total_pages} total={data.total} pageSize={data.page_size} onPageChange={setPage} />
        )}
      </Card>

      <ActivityFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
