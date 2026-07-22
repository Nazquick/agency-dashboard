"use client";

import { useMemo, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

export type SalesPoint = { date: string; amount: number };
export type PostMarker = { date: string; label: string };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 48;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PLOT_BOTTOM = 168;
const MARKER_Y = 196;

function formatShortDate(iso: string) {
  return new Date(iso + "T00:00:00").toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function SalesChart({ sales, postMarkers }: { sales: SalesPoint[]; postMarkers: PostMarker[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sorted = useMemo(
    () => [...sales].sort((a, b) => a.date.localeCompare(b.date)),
    [sales]
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
        No sales logged yet.
      </div>
    );
  }

  const minTime = new Date(sorted[0].date).getTime();
  const maxTime = new Date(sorted[sorted.length - 1].date).getTime();
  const timeSpan = Math.max(1, maxTime - minTime);
  const maxAmount = Math.max(...sorted.map((s) => s.amount), 1);

  function xFor(dateIso: string) {
    const t = new Date(dateIso).getTime();
    if (sorted.length === 1) return (PAD_LEFT + (WIDTH - PAD_RIGHT)) / 2;
    return PAD_LEFT + ((t - minTime) / timeSpan) * (WIDTH - PAD_LEFT - PAD_RIGHT);
  }

  function yFor(amount: number) {
    return PLOT_BOTTOM - (amount / (maxAmount * 1.1)) * (PLOT_BOTTOM - PAD_TOP);
  }

  const linePoints = sorted.map((s) => `${xFor(s.date)},${yFor(s.amount)}`).join(" ");
  const areaPoints = `${xFor(sorted[0].date)},${PLOT_BOTTOM} ${linePoints} ${xFor(
    sorted[sorted.length - 1].date
  )},${PLOT_BOTTOM}`;

  const gridLines = [0, 0.5, 1].map((f) => PAD_TOP + f * (PLOT_BOTTOM - PAD_TOP));

  function handleMove(e: MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    let nearestDist = Infinity;
    sorted.forEach((s, i) => {
      const d = Math.abs(xFor(s.date) - px);
      if (d < nearestDist) {
        nearestDist = d;
        nearest = i;
      }
    });
    setHoverIndex(nearest);
  }

  const hovered = hoverIndex != null ? sorted[hoverIndex] : null;
  const hoveredX = hovered ? xFor(hovered.date) : null;
  const tooltipLeft = hoveredX != null && hoveredX > WIDTH - 140;

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none select-none"
        onMouseMove={handleMove}
        onMouseLeave={() => setHoverIndex(null)}
      >
        {gridLines.map((y, i) => (
          <line
            key={i}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={y}
            y2={y}
            className="stroke-border"
            strokeWidth={1}
          />
        ))}
        <text x={4} y={PAD_TOP + 4} className="fill-muted-foreground text-[9px]">
          {Math.round(maxAmount * 1.1).toLocaleString()}
        </text>
        <text x={4} y={PLOT_BOTTOM + 4} className="fill-muted-foreground text-[9px]">
          0
        </text>

        <polygon points={areaPoints} className="fill-primary/10" />
        <polyline points={linePoints} fill="none" className="stroke-primary" strokeWidth={2} />
        {sorted.map((s, i) => (
          <circle
            key={s.date + i}
            cx={xFor(s.date)}
            cy={yFor(s.amount)}
            r={hoverIndex === i ? 5 : 3}
            className="fill-primary"
          />
        ))}

        {/* Content post markers — same x-scale, own strip beneath the line */}
        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={MARKER_Y}
          y2={MARKER_Y}
          className="stroke-border"
          strokeWidth={1}
        />
        {postMarkers.map((m, i) => (
          <circle
            key={m.date + i}
            cx={xFor(m.date)}
            cy={MARKER_Y}
            r={4}
            className="fill-amber-500 dark:fill-amber-400"
          >
            <title>{m.label}</title>
          </circle>
        ))}

        {hovered && hoveredX != null && (
          <>
            <line
              x1={hoveredX}
              x2={hoveredX}
              y1={PAD_TOP}
              y2={PLOT_BOTTOM}
              className="stroke-muted-foreground/40"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <foreignObject
              x={tooltipLeft ? hoveredX - 132 : hoveredX + 8}
              y={PAD_TOP}
              width={124}
              height={44}
            >
              <div className="rounded-md border bg-popover px-2 py-1 text-popover-foreground shadow-md">
                <p className="text-[10px] text-muted-foreground">{formatShortDate(hovered.date)}</p>
                <p className="text-xs font-medium">{Math.round(hovered.amount).toLocaleString()} kr</p>
              </div>
            </foreignObject>
          </>
        )}

        <text x={PAD_LEFT} y={HEIGHT - 4} className="fill-muted-foreground text-[9px]">
          {formatShortDate(sorted[0].date)}
        </text>
        <text
          x={WIDTH - PAD_RIGHT}
          y={HEIGHT - 4}
          textAnchor="end"
          className="fill-muted-foreground text-[9px]"
        >
          {formatShortDate(sorted[sorted.length - 1].date)}
        </text>
      </svg>
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={cn("inline-block h-2 w-2 rounded-full", "bg-primary")} aria-hidden />
          Sales
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full bg-amber-500 dark:bg-amber-400"
            aria-hidden
          />
          Content posted
        </span>
      </div>
    </div>
  );
}
