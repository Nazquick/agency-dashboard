"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { ROLES, isTeamLeader, roleLabel, type UserRole } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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

function suggestionFor(verdict: Verdict): string {
  if (verdict === "overloaded") return "Consider a raise";
  if (verdict === "underutilized") return "Consider a cut";
  return "No change";
}

export function WorkloadBalance({
  tasks,
  members,
  initialSalaries,
}: {
  tasks: WorkloadTask[];
  members: Tables<"profiles">[];
  initialSalaries: Tables<"profile_salaries">[];
}) {
  const actor = useUser();
  const leader = isTeamLeader(actor.role);

  const [salaries, setSalaries] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const s of initialSalaries) map[s.profile_id] = Number(s.monthly_salary);
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const roleCounts = useMemo(() => {
    const counts: Record<UserRole, number> = {
      editor_designer: 0,
      videographer_photographer: 0,
      social_media_manager: 0,
      team_leader: 0,
    };
    for (const t of tasks) {
      if (t.assignee) counts[t.assignee.role] += 1;
    }
    return counts;
  }, [tasks]);

  const average = ROLES.reduce((sum, r) => sum + roleCounts[r.value], 0) / ROLES.length;
  const maxCount = Math.max(1, ...ROLES.map((r) => roleCounts[r.value]));

  async function saveSalary(profileId: string, value: number) {
    setSavingId(profileId);
    const supabase = createClient();
    const { error } = await supabase
      .from("profile_salaries")
      .upsert({ profile_id: profileId, monthly_salary: value, updated_by: actor.id });
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Salary updated");
  }

  return (
    <div className="space-y-6">
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

      {leader && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Salary review</h2>
            <p className="text-sm text-muted-foreground">
              Visible to team leaders only. Use the workload balance above to guide raises or cuts.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Role</th>
                  <th className="px-4 py-2 font-medium">Active tasks</th>
                  <th className="px-4 py-2 font-medium">Monthly salary</th>
                  <th className="px-4 py-2 font-medium">Suggestion</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const count = roleCounts[member.role];
                  const verdict = verdictFor(count, average);
                  const value = salaries[member.id] ?? 0;
                  return (
                    <tr key={member.id} className="border-b last:border-0">
                      <td className="px-4 py-2 font-medium">{member.full_name}</td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {roleLabel(member.role)}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">{count}</td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          min={0}
                          step={50}
                          className="h-8 w-32"
                          value={value}
                          disabled={savingId === member.id}
                          onChange={(e) =>
                            setSalaries((prev) => ({
                              ...prev,
                              [member.id]: Number(e.target.value),
                            }))
                          }
                          onBlur={(e) => saveSalary(member.id, Number(e.target.value))}
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Badge className={VERDICT_CLASS[verdict]}>{suggestionFor(verdict)}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
