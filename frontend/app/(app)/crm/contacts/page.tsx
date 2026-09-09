"use client";

import { useState } from "react";
import { Plus, Search, UserCircle } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { ContactFormModal } from "@/components/crm/ContactFormModal";
import { useI18n } from "@/lib/contexts/i18n-context";
import { useContacts } from "@/lib/hooks/use-contacts";

export default function ContactsPage() {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useContacts({ page, page_size: 15, search: search || undefined });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle-foreground rtl:left-auto rtl:right-3" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("common.search")}
            className="pl-9 rtl:pl-3 rtl:pr-9"
          />
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm">
          <Plus className="h-4 w-4" />
          {t("crm.addContact")}
        </Button>
      </div>

      <Card className="overflow-hidden">
        {isLoading ? (
          <TableSkeleton />
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            icon={UserCircle}
            title={t("crm.noContacts")}
            description={t("crm.noContactsHint")}
            actionLabel={t("crm.addContact")}
            onAction={() => setModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground rtl:text-right">
                  <th className="px-5 py-3 font-medium">{t("common.name")}</th>
                  <th className="px-5 py-3 font-medium">{t("crm.jobTitle")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.company")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.email")}</th>
                  <th className="px-5 py-3 font-medium">{t("common.phone")}</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((contact) => (
                  <tr key={contact.id} className="border-b border-border/70 last:border-b-0 hover:bg-card-hover">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={`${contact.first_name} ${contact.last_name}`} size="xs" />
                        <span className="font-medium text-foreground">
                          {contact.first_name} {contact.last_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground">{contact.job_title ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{contact.company?.name ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{contact.email ?? "—"}</td>
                    <td className="px-5 py-3 text-muted-foreground">{contact.phone ?? "—"}</td>
                  </tr>
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

      <ContactFormModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
