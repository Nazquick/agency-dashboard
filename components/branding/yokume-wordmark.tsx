import { cn } from "@/lib/utils";

const SIZES = {
  md: { dot: "h-2 w-2", gap: "gap-2", text: "text-xl" },
  lg: { dot: "h-2.5 w-2.5", gap: "gap-2.5", text: "text-3xl" },
  xl: { dot: "h-3 w-3", gap: "gap-3", text: "text-4xl" },
} as const;

export function YokumeWordmark({
  size = "lg",
  className,
}: {
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <span aria-hidden className={cn("inline-block shrink-0 rounded-[2px] bg-[#151a2e]", s.dot)} />
      <span
        className={cn(
          "font-[family-name:var(--font-syne)] font-extrabold tracking-[0.14em] text-[#151a2e]",
          s.text
        )}
      >
        YOKUME
      </span>
    </div>
  );
}
