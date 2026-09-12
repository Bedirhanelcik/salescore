"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/contexts/auth-context";
import { Navbar } from "@/components/layout/Navbar";
import { Splash } from "@/components/layout/Splash";
import { MobileSidebarDrawer, Sidebar } from "@/components/layout/Sidebar";

const COLLAPSE_KEY = "salescore_sidebar_collapsed";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Reads localStorage after mount (see ThemeProvider) to keep server/client render identical.
  useEffect(() => {
    const stored = localStorage.getItem(COLLAPSE_KEY);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
    if (stored === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, String(next));
      return next;
    });
  };

  if (isLoading || !user) {
    return <Splash />;
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapse} />
      <MobileSidebarDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <Navbar onOpenMobileNav={() => setMobileNavOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full min-w-0 max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
