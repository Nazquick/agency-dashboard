import type { WorkloadTask } from "@/components/team/workload-kanban";

export type RawTaskRow = Omit<WorkloadTask, "assignee"> & {
  assignee: WorkloadTask["assignee"];
  task_assignees: { profile: WorkloadTask["assignee"] }[];
};

// "Full credit to each" — a task with multiple assignees counts once per
// assignee for workload/salary purposes, so we expand one task_assignees
// row into one WorkloadTask per person instead of just the primary.
export function flattenTasksByAssignee(rows: RawTaskRow[]): WorkloadTask[] {
  const result: WorkloadTask[] = [];
  for (const { task_assignees, ...rest } of rows) {
    const people = task_assignees
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
