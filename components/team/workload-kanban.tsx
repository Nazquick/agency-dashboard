import { ROLES, type UserRole } from "@/lib/auth/roles";
import { PRIORITY_BADGE_CLASS, priorityLabel } from "@/lib/tasks/constants";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";

export type WorkloadTask = Pick<Tables<"tasks">, "id" | "title" | "priority" | "deadline"> & {
  client: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; role: UserRole } | null;
};

export function WorkloadKanban({ tasks }: { tasks: WorkloadTask[] }) {
  const columns = ROLES.map((role) => ({
    role: role.value,
    label: role.label,
    tasks: tasks.filter((t) => t.assignee?.role === role.value),
  }));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Workload by role</h2>
        <p className="text-sm text-muted-foreground">
          Every active task, grouped by the role currently carrying it.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((column) => (
          <div key={column.role} className="rounded-lg border bg-card">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">{column.label}</span>
              <Badge variant="secondary">{column.tasks.length}</Badge>
            </div>
            <div className="space-y-2 p-2">
              {column.tasks.length === 0 ? (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                  Nothing assigned
                </p>
              ) : (
                column.tasks.map((task) => (
                  <div key={task.id} className="rounded-md border bg-background p-2.5">
                    <p className="truncate text-sm font-medium">{task.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {task.client?.name ?? "No client"}
                      {task.assignee ? ` · ${task.assignee.full_name}` : ""}
                    </p>
                    <Badge className={`${PRIORITY_BADGE_CLASS[task.priority]} mt-1.5`}>
                      {priorityLabel(task.priority)}
                    </Badge>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
