import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  md: { dot: "h-2 w-2", gap: "gap-2", text: "text-xl" },
  lg: { dot: "h-2.5 w-2.5", gap: "gap-2.5", text: "text-3xl" },
  xl: { dot: "h-3 w-3", gap: "gap-3", text: "text-4xl" },
} as const;

const LETTERS = [
  { char: "Y", dx: -3, dy: -2, dz: 2, rx: -6, ry: 8, rz: -4 },
  { char: "O", dx: -2, dy: 2, dz: -2, rx: 7, ry: -5, rz: 5 },
  { char: "K", dx: -1, dy: -3, dz: 2, rx: -8, ry: 4, rz: 6 },
  { char: "U", dx: 1, dy: 3, dz: -2, rx: 6, ry: -7, rz: -5 },
  { char: "M", dx: 2, dy: -2, dz: 2, rx: -5, ry: 6, rz: 4 },
  { char: "E", dx: 3, dy: 2, dz: -1, rx: 8, ry: -4, rz: -6 },
] as const;

export function YokumeWordmark({
  size = "lg",
  animated = false,
  className,
}: {
  size?: keyof typeof SIZES;
  animated?: boolean;
  className?: string;
}) {
  const s = SIZES[size];
  return (
    <div className={cn("flex items-center", s.gap, className)}>
      <span aria-hidden className={cn("inline-block shrink-0 rounded-[2px] bg-foreground", s.dot)} />
      {animated ? (
        <span
          aria-label="YOKUME"
          className={cn(
            "yokume-mini-scene inline-flex font-[family-name:var(--font-syne)] font-extrabold tracking-[0.14em] text-foreground",
            s.text
          )}
        >
          {LETTERS.map((l, i) => (
            <span
              key={l.char}
              aria-hidden
              className="yokume-mini-letter"
              style={
                {
                  "--i": i,
                  "--dx": l.dx,
                  "--dy": l.dy,
                  "--dz": l.dz,
                  "--rx": l.rx,
                  "--ry": l.ry,
                  "--rz": l.rz,
                } as CSSProperties
              }
            >
              {l.char}
            </span>
          ))}
        </span>
      ) : (
        <span
          className={cn(
            "font-[family-name:var(--font-syne)] font-extrabold tracking-[0.14em] text-foreground",
            s.text
          )}
        >
          YOKUME
        </span>
      )}
    </div>
  );
}
