import { Loader2 } from "lucide-react";

import { Logo } from "./Logo";

/**
 * Lightweight branded loading state used while auth is resolving on a given
 * route (root redirect, the authenticated shell, login/register guards).
 * Distinct from `AppIntro`, the one-time animated splash shown at app boot.
 */
export function Splash() {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center gap-4 bg-background">
      <Logo size="md" />
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}
