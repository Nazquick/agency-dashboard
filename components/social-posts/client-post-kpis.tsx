"use client";

import { useMemo } from "react";
import { Check } from "lucide-react";
import { MEDIA_TYPES } from "@/lib/social-posts/constants";
import type { ClientTheme } from "@/lib/social-posts/client-themes";
import type { PostWithRelations } from "@/components/social-posts/create-post-dialog";
import { cn } from "@/lib/utils";

export const WEEKLY_POST_TARGET = 4;

function formatDay(d: Date): string {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

// `grid` is the calendar's Monday-start 6x7 day grid, so each slice of 7 is
// one Monday-to-Sunday week. Weeks with no day in the viewed month (the
// grid's trailing row) are left out.
export function ClientPostKpis({
  posts,
  month,
  grid,
  theme,
}: {
  posts: PostWithRelations[];
  month: Date;
  grid: Date[];
  theme: ClientTheme | null;
}) {
  const monthLabel = month.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const typeCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of posts) {
      const d = new Date(p.post_at);
      if (d.getFullYear() !== month.getFullYear() || d.getMonth() !== month.getMonth()) continue;
      counts.set(p.media_type, (counts.get(p.media_type) ?? 0) + 1);
    }
    return counts;
  }, [posts, month]);

  const monthTotal = [...typeCounts.values()].reduce((sum, n) => sum + n, 0);

  const weeks = useMemo(() => {
    const now = new Date();
    const rows: { start: Date; end: Date; count: number; isCurrent: boolean; isPast: boolean }[] = [];
    for (let r = 0; r < grid.length; r += 7) {
      const days = grid.slice(r, r + 7);
      if (!days.some((d) => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear())) {
        continue;
      }
      const start = days[0];
      const end = days[6];
      const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
      const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate() + 1).getTime();
      const count = posts.filter((p) => {
        const t = new Date(p.post_at).getTime();
        return t >= startMs && t < endMs;
      }).length;
      rows.push({
        start,
        end,
        count,
        isCurrent: now.getTime() >= startMs && now.getTime() < endMs,
        isPast: now.getTime() >= endMs,
      });
    }
    return rows;
  }, [posts, month, grid]);

  const fillColor = theme?.hex ?? "var(--primary)";

  return (
    <div className="space-y-5 rounded-lg border bg-card p-4">
      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Posts in {monthLabel}</h3>
          <span className="text-xs text-muted-foreground">{monthTotal} in total</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {MEDIA_TYPES.map((m) => (
            <div key={m.value} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.hex }} />
                {m.label}
              </span>
              <span className="font-semibold tabular-nums">{typeCounts.get(m.value) ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold">Weekly target — {WEEKLY_POST_TARGET} posts a week</h3>
          <span className="text-xs text-muted-foreground">Mon–Sun</span>
        </div>
        <div className="space-y-2">
          {weeks.map((w) => {
            const met = w.count >= WEEKLY_POST_TARGET;
            const short = WEEKLY_POST_TARGET - w.count;
            return (
              <div
                key={w.start.toISOString()}
                className={cn(
                  "grid grid-cols-[7.5rem_1fr_6rem] items-center gap-3 rounded-md px-2 py-1.5 text-sm",
                  w.isCurrent && "bg-muted/60"
                )}
              >
                <span className="text-xs text-muted-foreground">
                  {formatDay(w.start)} – {formatDay(w.end)}
                  {w.isCurrent && <span className="ml-1 font-medium text-foreground">· now</span>}
                </span>
                <div
                  className="flex gap-1"
                  role="img"
                  aria-label={`${Math.min(w.count, WEEKLY_POST_TARGET)} of ${WEEKLY_POST_TARGET} posts`}
                >
                  {Array.from({ length: WEEKLY_POST_TARGET }, (_, i) => (
                    <div
                      key={i}
                      className={cn("h-3 flex-1 rounded-full transition-colors", i >= w.count && "bg-muted")}
                      style={i < w.count ? { backgroundColor: fillColor } : undefined}
                    />
                  ))}
                </div>
                <span className="flex items-center justify-end gap-1 text-xs tabular-nums">
                  {met ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-green-600" />
                      <span className="font-semibold">
                        {w.count}/{WEEKLY_POST_TARGET}
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">
                        {w.count}/{WEEKLY_POST_TARGET}
                      </span>
                      {w.isPast && <span className="text-amber-600">−{short}</span>}
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
