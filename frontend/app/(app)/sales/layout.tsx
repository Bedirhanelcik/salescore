"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs } from "@/components/ui/Tabs";
import { useI18n } from "@/lib/contexts/i18n-context";

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();

  if (pathname.startsWith("/sales/deals/")) {
    return <div>{children}</div>;
  }

  const tabs = [
    { key: "/sales/pipeline", label: t("sales.pipeline") },
    { key: "/sales/targets", label: t("sales.targets") },
  ];
  const active = tabs.find((tab) => pathname.startsWith(tab.key))?.key ?? tabs[0].key;

  return (
    <div className="space-y-5">
      <Tabs tabs={tabs} active={active} onChange={(key) => router.push(key)} />
      {children}
    </div>
  );
}
