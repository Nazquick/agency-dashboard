"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser, useRoles } from "@/components/providers/user-provider";
import { roleLabel } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { WorkloadTask } from "@/components/team/workload-kanban";

type Verdict = "overloaded" | "balanced" | "underutilized";

const VERDICT_CLASS: Record<Verdict, string> = {
  overloaded: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  balanced: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  underutilized: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
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

export function SalaryPanel({
  tasks,
  members,
  initialSalaries,
}: {
  tasks: WorkloadTask[];
  members: Tables<"profiles">[];
  initialSalaries: Tables<"profile_salaries">[];
}) {
  const actor = useUser();
  const roles = useRoles();

  const [salaries, setSalaries] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const s of initialSalaries) map[s.profile_id] = Number(s.monthly_salary);
    return map;
  });
  const [savingId, setSavingId] = useState<string | null>(null);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of tasks) {
      if (t.assignee) counts[t.assignee.role] = (counts[t.assignee.role] ?? 0) + 1;
    }
    return counts;
  }, [tasks]);

  // Average over roles actually represented on the team, not the whole
  // roles catalog — an unused custom role shouldn't dilute the baseline.
  const memberRoles = Array.from(new Set(members.map((m) => m.role)));
  const average =
    memberRoles.length > 0
      ? memberRoles.reduce((sum, r) => sum + (roleCounts[r] ?? 0), 0) / memberRoles.length
      : 0;

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
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Use each member&apos;s active task count to guide raises or cuts.
      </p>
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
              const count = roleCounts[member.role] ?? 0;
              const verdict = verdictFor(count, average);
              const value = salaries[member.id] ?? 0;
              return (
                <tr key={member.id} className="border-b last:border-0">
                  <td className="px-4 py-2 font-medium">{member.full_name}</td>
                  <td className="px-4 py-2 text-muted-foreground">{roleLabel(member.role, roles)}</td>
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
  );
}
