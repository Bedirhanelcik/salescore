"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Splash } from "@/components/layout/Splash";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return <Splash />;
}
