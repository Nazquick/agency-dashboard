import { DyorLogo } from "@/components/branding/dyor-logo";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "h-4",
  lg: "h-5",
  xl: "h-7",
} as const;

export function DyorWordmark({
  size = "lg",
  animated = false,
  className,
}: {
  size?: keyof typeof SIZES;
  animated?: boolean;
  className?: string;
}) {
  return (
    <DyorLogo
      className={cn(
        SIZES[size],
        "w-auto text-foreground",
        animated && "transition-transform duration-500 ease-out hover:-rotate-1 hover:scale-[1.03]",
        className
      )}
    />
  );
}
