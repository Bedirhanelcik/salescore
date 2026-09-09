"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckSquare, Plus } from "lucide-react";

import { PriorityBadge, TaskStatusBadge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Select } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { TaskFormModal } from "@/components/operations/TaskFormModal";
import { ApiError } from "@/lib/api-client";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useTasks, useUpdateTask } from "@/lib/hooks/use-tasks";
import type { TaskStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export default function TasksPage() {
  const { t, locale } = useI18n();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useTasks({ page, page_size: 20, status: status || undefined, mine_only: mineOnly });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-40"
        >
          <option value="">
            {t("common.status")}: {t("common.all")}
          </option>
          <option value="todo">{t("operations.taskStatus.todo")}</option>
          <option value="in_progress">{t("operations.taskStatus.in_progress")}</option>
          <option value="completed">{t("operations.taskStatus.completed")}</option>
          <option value="overdue">{t("operations.taskStatus.overdue")}</option>
        </Select>
        <button
          onClick={() => {
            setMineOnly((v) => !v);
            setPage(1);
          }}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium",
            mineOnly
              ? "border-brand bg-brand-subtle text-brand"
              : "border-border text-muted-foreground hover:bg-card-hover"
          )}
        >
          {t("operations.myTasksOnly")}
        </button>
        <Button onClick={() => setModalOpen(true)} size="sm" className="ms-auto">
          <Plus className="h-4 w-4" />
          {t("operations.addTask")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title={t("operations.noTasks")}
            actionLabel={t("operations.addTask")}
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("operations.priority")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.status")}</th>
                  <th className="px-5 py-3 font-medium">{t("operations.dueDate")}</th>
                  <th className="px-5 py-3 font-medium">{t("operations.assignee")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((task) => (
                  <TaskRow key={task.id} task={task} locale={locale} t={t} />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data && data.total > 0 && (
          <Pagination
            page={data.page}
            totalPages={data.total_pages}
            total={data.total}
            pageSize={data.page_size}
            onPageChange={setPage}
          />
        )}
      </Card>

      <TaskFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

function TaskRow({
  task,
  locale,
  t,
}: {
  task: import("@/lib/types").Task;
  locale: string;
  t: (key: string) => string;
}) {
  const updateTask = useUpdateTask(task.id);

  const cycleStatus = () => {
    const next: Record<TaskStatus, TaskStatus> = {
      todo: "in_progress",
      in_progress: "completed",
      completed: "todo",
      overdue: "in_progress",
    };
    updateTask.mutate(
      { status: next[task.status] },
      { onError: (err) => toast.error(err instanceof ApiError ? err.message : t("common.somethingWentWrong")) }
    );
  };

  return (
    <tr className="border-b border-border/70 last:border-b-0 hover:bg-card-hover">
      <td className="px-5 py-3 font-medium text-foreground">{task.title}</td>
      <td className="px-5 py-3">
        <PriorityBadge priority={task.priority} label={t(`operations.priorities.${task.priority}`)} />
      </td>
      <td className="px-5 py-3">
        <button onClick={cycleStatus}>
          <TaskStatusBadge status={task.status} label={t(`operations.taskStatus.${task.status}`)} />
        </button>
      </td>
      <td className="px-5 py-3 text-muted-foreground">{task.due_date ? formatDate(task.due_date, locale) : "—"}</td>
      <td className="px-5 py-3">
        {task.assignee && (
          <div className="flex items-center gap-2">
            <Avatar name={task.assignee.full_name} color={task.assignee.avatar_color} size="xs" />
            <span className="text-xs text-muted-foreground">{task.assignee.full_name}</span>
          </div>
        )}
      </td>
    </tr>
  );
}
