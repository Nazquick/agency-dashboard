import type { Tables } from "@/lib/types/database.types";

// Pure functions turning the client's raw report/asset/sales rows into the
// "after DYOR" side of the portal comparison. No fetching here — mirrors
// the style of lib/analytics/metrics.ts and sales.ts.

type Report = Tables<"client_reports">;
type Asset = Tables<"content_assets">;
type Sale = Tables<"client_sales">;

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function reportViews(r: Report): number {
  return (
    (r.instagram_views ?? 0) +
    (r.tiktok_views ?? 0) +
    (r.facebook_views ?? 0) +
    (r.snapchat_views ?? 0)
  );
}

function reportLikes(r: Report): number {
  return (
    (r.instagram_likes ?? 0) + (r.tiktok_likes ?? 0) + (r.facebook_likes ?? 0) + (r.snapchat_likes ?? 0)
  );
}

function reportComments(r: Report): number {
  return (
    (r.instagram_comments ?? 0) +
    (r.tiktok_comments ?? 0) +
    (r.facebook_comments ?? 0) +
    (r.snapchat_comments ?? 0)
  );
}

export interface PortalAfterMetrics {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  mentions: number;
  ad_spend: number;
  roas: number;
  sales: number;
}

// "posts/views/likes/comments/mentions" are averaged per report — matches
// the framing of a baseline "typical numbers" snapshot. "shares" (from
// content_assets, which has no report-period concept) and "sales" are
// summed totals since DYOR started, and ad_spend/roas use the most
// recent report as the current run-rate.
export function computeAfterMetrics(
  reports: Report[],
  assets: Asset[],
  sales: Sale[]
): PortalAfterMetrics {
  const mentionsValues = reports
    .map((r) => r.mentions)
    .filter((v): v is number => v != null);
  const latestReport = [...reports].sort((a, b) => b.report_date.localeCompare(a.report_date))[0];

  return {
    posts: Math.round(avg(reports.map((r) => r.content_count ?? 0))),
    views: Math.round(avg(reports.map(reportViews))),
    likes: Math.round(avg(reports.map(reportLikes))),
    comments: Math.round(avg(reports.map(reportComments))),
    shares: assets.reduce((sum, a) => sum + a.shares, 0),
    mentions: Math.round(avg(mentionsValues)),
    ad_spend: latestReport?.ad_spend ?? 0,
    roas: latestReport?.roas ?? 0,
    sales: sales.reduce((sum, s) => sum + s.amount, 0),
  };
}
