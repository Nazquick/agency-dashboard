"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface ComparisonMetric {
  key: string;
  label: string;
  before: number;
  after: number;
  format?: (n: number) => string;
}

// Simple ease-out count-up, no dependency. `start` gates it so multiple
// instances on a page can stagger rather than all firing on mount.
export function useCountUp(target: number, start: boolean, durationMs = 1000) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;
    let raf: number;
    const startTime = performance.now();

    function tick(now: number) {
      const progress = Math.min((now - startTime) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, start, durationMs]);

  return value;
}

const defaultFormat = (n: number) => Math.round(n).toLocaleString();

export function BeforeAfterChart({ metrics }: { metrics: ComparisonMetric[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="space-y-7">
      {metrics.map((metric, index) => {
        const max = Math.max(metric.before, metric.after, 1);
        const beforePct = mounted ? Math.max((metric.before / max) * 100, metric.before > 0 ? 2 : 0) : 0;
        const afterPct = mounted ? Math.max((metric.after / max) * 100, metric.after > 0 ? 2 : 0) : 0;
        const format = metric.format ?? defaultFormat;
        const change =
          metric.before > 0 ? Math.round(((metric.after - metric.before) / metric.before) * 100) : null;

        return (
          <div key={metric.key} className="space-y-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-semibold">{metric.label}</span>
              {change !== null && (
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    change >= 0
                      ? "bg-emerald-500/15 text-emerald-500"
                      : "bg-red-500/15 text-red-500"
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {change}%
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Before
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-muted-foreground/40 transition-[width] duration-[1100ms] ease-out"
                    style={{ width: `${beforePct}%`, transitionDelay: `${index * 90}ms` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                  {format(metric.before)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-14 shrink-0 text-[10px] font-medium uppercase tracking-wide text-primary">
                  After
                </span>
                <div className="h-3 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary via-primary/85 to-primary/50 transition-[width] duration-[1100ms] ease-out"
                    style={{ width: `${afterPct}%`, transitionDelay: `${index * 90 + 140}ms` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-sm font-bold">{format(metric.after)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
