import { cn } from "@/lib/utils";

const MARK_SIZE = {
  sm: "h-7 w-7 rounded-md text-sm",
  md: "h-11 w-11 rounded-xl text-lg",
  lg: "h-16 w-16 rounded-2xl text-2xl",
};

const WORDMARK_SIZE = {
  sm: "text-[15px]",
  md: "text-xl",
  lg: "text-2xl",
};

/**
 * The single source of truth for the SalesCore brand mark - reused in the
 * sidebar, mobile drawer, auth pages, and the boot intro so the icon never
 * drifts out of sync with `app/icon.tsx` / `app/apple-icon.tsx`.
 */
export function Logo({
  size = "md",
  withWordmark = false,
  className,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className={cn("flex shrink-0 items-center justify-center bg-brand font-bold text-white", MARK_SIZE[size])}>
        S
      </div>
      {withWordmark && (
        <span className={cn("font-bold tracking-tight text-foreground", WORDMARK_SIZE[size])}>SalesCore</span>
      )}
    </div>
  );
}
