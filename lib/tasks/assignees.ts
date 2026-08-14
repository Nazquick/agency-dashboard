import type { WorkloadTask } from "@/components/team/workload-kanban";
import type { Tables } from "@/lib/types/database.types";
import type { TaskWithRelations } from "@/components/pipeline/pipeline-board";

export type RawTaskRow = Omit<WorkloadTask, "assignee"> & {
  assignee: WorkloadTask["assignee"];
  task_assignees?: { profile: WorkloadTask["assignee"] }[] | null;
};

type AssigneeSummary = { id: string; full_name: string; role: Tables<"profiles">["role"] };

// Kept out of pipeline-board.tsx (a "use client" file) so Server Components
// like app/(dashboard)/pipeline/page.tsx can call it directly — a plain
// function exported from a client-marked module can't be invoked from the
// server, only rendered as a component.
export function flattenAssignees(
  rows: (Tables<"tasks"> & {
    client: { id: string; name: string } | null;
    credit_client: { id: string; name: string } | null;
    assignee: AssigneeSummary | null;
    task_assignees?: { profile: AssigneeSummary | null }[] | null;
  })[]
): TaskWithRelations[] {
  return rows.map(({ task_assignees, ...row }) => ({
    ...row,
    assignees: (task_assignees ?? [])
      .map((ta) => ta.profile)
      .filter((p): p is AssigneeSummary => p !== null),
  }));
}

// "Full credit to each" — a task with multiple assignees counts once per
// assignee for workload/salary purposes, so we expand one task_assignees
// row into one WorkloadTask per person instead of just the primary.
export function flattenTasksByAssignee(rows: RawTaskRow[]): WorkloadTask[] {
  const result: WorkloadTask[] = [];
  for (const { task_assignees, ...rest } of rows) {
    const people = (task_assignees ?? [])
      .map((ta) => ta.profile)
      .filter((p): p is NonNullable<typeof p> => p !== null);
    if (people.length === 0) {
      result.push(rest);
    } else {
      for (const person of people) {
        result.push({ ...rest, assignee: person });
      }
    }
  }
  return result;
}
