"use client";

import { useEffect, useState } from "react";
import { formatSales } from "@/lib/analytics/sales";
import type { PortalAfterMetrics } from "@/lib/analytics/portal-metrics";
import type { Tables } from "@/lib/types/database.types";
import { BeforeAfterChart, useCountUp, type ComparisonMetric } from "@/components/portal/before-after-chart";
import { Card, CardContent } from "@/components/ui/card";

function StatCard({
  label,
  value,
  start,
  format,
}: {
  label: string;
  value: number;
  start: boolean;
  format: (n: number) => string;
}) {
  const animated = useCountUp(value, start);
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{format(animated)}</p>
      </CardContent>
    </Card>
  );
}

function roasFormat(n: number) {
  return `${n.toFixed(1)}x`;
}

export function PortalAnalytics({
  clientName,
  after,
  baseline,
}: {
  clientName: string;
  after: PortalAfterMetrics;
  baseline: Tables<"client_baselines"> | null;
}) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100);
    return () => clearTimeout(t);
  }, []);

  const comparisonMetrics: ComparisonMetric[] = baseline
    ? (
        [
          { key: "posts", label: "Posts", before: baseline.posts, after: after.posts },
          { key: "views", label: "Views", before: baseline.views, after: after.views },
          { key: "likes", label: "Likes", before: baseline.likes, after: after.likes },
          { key: "comments", label: "Comments", before: baseline.comments, after: after.comments },
          { key: "shares", label: "Shares", before: baseline.shares, after: after.shares },
          { key: "mentions", label: "Mentions", before: baseline.mentions, after: after.mentions },
          {
            key: "ad_spend",
            label: "Ad spend",
            before: baseline.ad_spend,
            after: after.ad_spend,
            format: formatSales,
          },
          { key: "roas", label: "ROAS", before: baseline.roas, after: after.roas, format: roasFormat },
          { key: "sales", label: "Sales", before: baseline.sales, after: after.sales, format: formatSales },
        ] as { key: string; label: string; before: number | null; after: number; format?: (n: number) => string }[]
      ).filter((m): m is ComparisonMetric => m.before != null)
    : [];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border bg-card px-6 py-10 sm:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-24 -top-24 size-72 rounded-full bg-primary/20 blur-3xl animate-pulse"
          style={{ animationDuration: "6s" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -right-16 size-80 rounded-full bg-primary/10 blur-3xl animate-pulse"
          style={{ animationDuration: "8s" }}
        />
        <div className="relative space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Analytics</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {clientName}&apos;s results with DYOR
          </h1>
          <p className="max-w-xl text-sm text-muted-foreground">
            Everything the team has logged for your account — updated as new reports come in.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Avg. views / report" value={after.views} start={ready} format={(n) => Math.round(n).toLocaleString()} />
        <StatCard label="Avg. likes / report" value={after.likes} start={ready} format={(n) => Math.round(n).toLocaleString()} />
        <StatCard label="Total shares" value={after.shares} start={ready} format={(n) => Math.round(n).toLocaleString()} />
        <StatCard label="Total sales" value={after.sales} start={ready} format={formatSales} />
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Before DYOR vs. after DYOR</h2>
          <p className="text-sm text-muted-foreground">
            The numbers your team started with, put up against where you are now.
          </p>
        </div>

        {comparisonMetrics.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Your team hasn&apos;t set up your before/after comparison yet — check back soon.
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6 sm:p-8">
              <BeforeAfterChart metrics={comparisonMetrics} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
