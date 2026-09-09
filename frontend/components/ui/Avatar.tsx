import { initials } from "@/lib/utils";

export function Avatar({
  name,
  color = "#4338ca",
  size = "sm",
}: {
  name: string;
  color?: string;
  size?: "xs" | "sm" | "md";
}) {
  const sizeClasses = { xs: "h-5 w-5 text-[9px]", sm: "h-7 w-7 text-[11px]", md: "h-9 w-9 text-xs" }[size];
  return (
    <div
      className={`flex ${sizeClasses} shrink-0 items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
