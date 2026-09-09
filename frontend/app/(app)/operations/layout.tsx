"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function OperationsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  if (pathname.startsWith("/operations/employees/") && pathname !== "/operations/employees/") {
    return <div>{children}</div>;
  }

  const tabs = [
    { key: "/operations/tasks", label: t("operations.tasks") },
    { key: "/operations/activities", label: t("operations.activities") },
    { key: "/operations/employees", label: t("operations.employees") },
    { key: "/operations/departments", label: t("operations.departments") },
  ];
  const active = tabs.find((tab) => pathname.startsWith(tab.key))?.key ?? tabs[0].key;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("nav.operations")}</h1>
      </div>
      <Tabs tabs={tabs} active={active} onChange={(key) => router.push(key)} />
      {children}
    </div>
  );
}
