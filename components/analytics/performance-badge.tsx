import { Badge } from "@/components/ui/badge";
import type { PerformanceTier } from "@/lib/analytics/metrics";

const LABEL: Record<PerformanceTier, string> = {
  high: "Top performer",
  low: "Needs attention",
  normal: "Normal",
};

const CLASS: Record<PerformanceTier, string> = {
  high: "bg-green-100 text-green-700",
  low: "bg-red-100 text-red-700",
  normal: "bg-gray-100 text-gray-700",
};

export function PerformanceBadge({ tier }: { tier: PerformanceTier }) {
  if (tier === "normal") return null;
  return <Badge className={CLASS[tier]}>{LABEL[tier]}</Badge>;
}
