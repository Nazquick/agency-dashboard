"use client";

import { useMemo } from "react";
import { ROLES, type UserRole } from "@/lib/auth/roles";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { WorkloadTask } from "@/components/team/workload-kanban";

type Verdict = "overloaded" | "balanced" | "underutilized";

const VERDICT_LABEL: Record<Verdict, string> = {
  overloaded: "Overloaded",
  balanced: "Balanced",
  underutilized: "Underutilized",
};

const VERDICT_CLASS: Record<Verdict, string> = {
  overloaded: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  balanced: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  underutilized: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
};

const VERDICT_BAR: Record<Verdict, string> = {
  overloaded: "bg-red-500",
  balanced: "bg-green-500",
  underutilized: "bg-blue-400",
};

function verdictFor(count: number, average: number): Verdict {
  if (average <= 0) return "balanced";
  if (count >= average * 1.5) return "overloaded";
  if (count <= average * 0.5) return "underutilized";
  return "balanced";
}

export function WorkloadBalance({ tasks }: { tasks: WorkloadTask[] }) {
  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = {
      editor_designer: 0,
      videographer_photographer: 0,
      social_media_manager: 0,
      team_leader: 0,
      client: 0,
    };
    for (const t of tasks) {
      if (t.assignee) counts[t.assignee.role] += 1;
    }
    return counts;
  }, [tasks]);

  const average = ROLES.reduce((sum, r) => sum + roleCounts[r.value], 0) / ROLES.length;
  const maxCount = Math.max(1, ...ROLES.map((r) => roleCounts[r.value]));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Balance across roles</h2>
        <p className="text-sm text-muted-foreground">
          Active task counts side by side — spot who&apos;s carrying more than their share.
        </p>
      </div>
      <div className="space-y-3 rounded-lg border bg-card p-4">
        {ROLES.map((role) => {
          const count = roleCounts[role.value];
          const verdict = verdictFor(count, average);
          return (
            <div key={role.value} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{role.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{count} active</span>
                  <Badge className={VERDICT_CLASS[verdict]}>{VERDICT_LABEL[verdict]}</Badge>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn("h-full rounded-full transition-all", VERDICT_BAR[verdict])}
                  style={{ width: `${Math.max(4, (count / maxCount) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
