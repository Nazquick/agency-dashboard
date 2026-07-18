import { Badge } from "@/components/ui/badge";
import type { PerformanceTier } from "@/lib/analytics/metrics";

const LABEL: Record<PerformanceTier, string> = {
  high: "Top performer",
  low: "Needs attention",
  normal: "Normal",
};

const CLASS: Record<PerformanceTier, string> = {
  high: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  low: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  normal: "bg-muted text-muted-foreground",
};

export function PerformanceBadge({ tier }: { tier: PerformanceTier }) {
  if (tier === "normal") return null;
  return <Badge className={CLASS[tier]}>{LABEL[tier]}</Badge>;
}
