import type { Tables } from "@/lib/types/database.types";

export type Asset = Tables<"content_assets">;

// Weighted so stronger engagement signals (comments, shares) count for more
// than passive ones (views, likes).
export function engagementScore(asset: Pick<Asset, "views" | "likes" | "comments" | "shares">) {
  return asset.views * 0.1 + asset.likes * 1 + asset.comments * 2 + asset.shares * 3;
}

export type PerformanceTier = "high" | "low" | "normal";

// Classifies each asset relative to the other assets for the *same client*.
// Needs at least a handful of assets to be meaningful — with fewer, everything
// reads as "normal" rather than making a call on too little data.
export function classifyPerformance(assets: Asset[]): Map<string, PerformanceTier> {
  const result = new Map<string, PerformanceTier>();
  if (assets.length < 4) {
    assets.forEach((a) => result.set(a.id, "normal"));
    return result;
  }

  const scores = assets
    .map((a) => ({ id: a.id, score: engagementScore(a) }))
    .sort((a, b) => a.score - b.score);

  const q1Index = Math.floor(scores.length * 0.25);
  const q3Index = Math.floor(scores.length * 0.75);
  const lowCutoff = scores[q1Index].score;
  const highCutoff = scores[q3Index].score;

  for (const { id, score } of scores) {
    if (score >= highCutoff && highCutoff > lowCutoff) {
      result.set(id, "high");
    } else if (score <= lowCutoff && highCutoff > lowCutoff) {
      result.set(id, "low");
    } else {
      result.set(id, "normal");
    }
  }
  return result;
}

// 0-100, relative to whichever client had the most combined tasks + calendar
// events in the trailing window — not an absolute scale, since "busy" only
// means something compared to the rest of the roster.
export function activityHealth({
  clientId,
  tasks,
  events,
  windowDays = 30,
  allClientIds,
}: {
  clientId: string;
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at">[];
  events: Pick<Tables<"calendar_events">, "client_id" | "created_at">[];
  windowDays?: number;
  allClientIds: string[];
}): number {
  const cutoff = Date.now() - windowDays * 24 * 60 * 60 * 1000;

  const countFor = (id: string) => {
    const taskCount = tasks.filter(
      (t) => t.client_id === id && new Date(t.created_at).getTime() >= cutoff
    ).length;
    const eventCount = events.filter(
      (e) => e.client_id === id && new Date(e.created_at).getTime() >= cutoff
    ).length;
    return taskCount + eventCount;
  };

  const counts = allClientIds.map(countFor);
  const max = Math.max(1, ...counts);
  return Math.round((countFor(clientId) / max) * 100);
}

export function startOfCurrentMonthIso(): string {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export function tasksThisMonth(
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at">[],
  clientId: string
): number {
  const start = startOfCurrentMonthIso();
  return tasks.filter((t) => t.client_id === clientId && t.created_at >= start).length;
}
