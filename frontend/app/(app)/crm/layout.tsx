"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  const tabs = [
    { key: "/crm/companies", label: t("crm.companies") },
    { key: "/crm/contacts", label: t("crm.contacts") },
    { key: "/crm/leads", label: t("crm.leads") },
  ];

  const active = tabs.find((tab) => pathname.startsWith(tab.key))?.key ?? tabs[0].key;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">{t("nav.crm")}</h1>
      </div>
      <Tabs tabs={tabs} active={active} onChange={(key) => router.push(key)} />
      {children}
    </div>
  );
}
