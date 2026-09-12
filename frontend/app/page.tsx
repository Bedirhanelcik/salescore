"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/contexts/auth-context";
import { Splash } from "@/components/layout/Splash";

export default function RootPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    router.replace(user ? "/dashboard" : "/register");
  }, [isLoading, user, router]);

  return <Splash />;
}
