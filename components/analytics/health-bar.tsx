import { cn } from "@/lib/utils";

function healthColor(score: number) {
  if (score >= 66) return "bg-green-500";
  if (score >= 33) return "bg-amber-500";
  return "bg-red-400";
}

function healthLabel(score: number) {
  if (score >= 66) return "High attention";
  if (score >= 33) return "Medium attention";
  return "Low attention";
}

export function HealthBar({ score, className }: { score: number; className?: string }) {
  return (
    <div className={cn("space-y-1", className)}>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn("h-full rounded-full transition-all", healthColor(score))}
          style={{ width: `${Math.max(4, score)}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground">{healthLabel(score)}</p>
    </div>
  );
}
