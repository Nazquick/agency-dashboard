"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronDown, ChevronRight, Layers } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser, useGroups } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import {
  PRIORITIES,
  STATUSES,
  PRIORITY_BADGE_CLASS,
  PRIORITY_RANK,
  priorityLabel,
  statusLabel,
  isLongUrgent,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks/constants";
import { TaskForm } from "@/components/pipeline/task-form";
import { TaskColorDot } from "@/components/tasks/task-color-dot";
import { taskColor, TASK_COLOR_LABEL } from "@/lib/tasks/color-code";
import { flattenAssignees } from "@/lib/tasks/assignees";
import { cn } from "@/lib/utils";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ALL = "__all__";
const ME = "__me__";

type AssigneeSummary = { id: string; full_name: string; role: Tables<"profiles">["role"] };

export type TaskWithRelations = Tables<"tasks"> & {
  client: { id: string; name: string } | null;
  assignee: AssigneeSummary | null;
  assignees: AssigneeSummary[];
};

function resolveAssignees(
  ids: string[],
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role">[]
): AssigneeSummary[] {
  return ids
    .map((id) => profiles.find((p) => p.id === id))
    .filter((p): p is AssigneeSummary => p !== undefined);
}

function formatDeadline(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type RenderItem =
  | { type: "single"; task: TaskWithRelations }
  | { type: "group"; batchId: string; tasks: TaskWithRelations[] };

// Tasks created together via "All {group}" bulk-create share a batch_id —
// collapse those into one row in the pipeline view instead of listing
// every location separately, as long as more than one sibling is still
// visible after filtering (a lone survivor just renders like any other
// task).
function groupByBatch(list: TaskWithRelations[]): RenderItem[] {
  const seen = new Set<string>();
  const items: RenderItem[] = [];
  for (const t of list) {
    if (!t.batch_id) {
      items.push({ type: "single", task: t });
      continue;
    }
    if (seen.has(t.batch_id)) continue;
    seen.add(t.batch_id);
    const members = list.filter((x) => x.batch_id === t.batch_id);
    if (members.length > 1) {
      items.push({ type: "group", batchId: t.batch_id, tasks: members });
    } else {
      items.push({ type: "single", task: t });
    }
  }
  return items;
}

export function PipelineBoard({
  initialTasks,
  clients,
  profiles,
  defaultClientId,
  showClientColumn = true,
}: {
  initialTasks: TaskWithRelations[];
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_external">[];
  defaultClientId?: string;
  showClientColumn?: boolean;
}) {
  const profile = useUser();
  const groups = useGroups();
  const leader = isTeamLeader(profile.role);
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());

  function toggleBatch(batchId: string) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      let query = supabase
        .from("tasks")
        .select(
          "*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role), task_assignees(profile:profiles(id, full_name, role))"
        )
        .order("created_at", { ascending: false });
      if (defaultClientId) {
        query = query.eq("client_id", defaultClientId);
      }
      const { data } = await query;
      if (data) setTasks(flattenAssignees(data));
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      channel = supabase
        .channel(`tasks-board-${defaultClientId ?? "all"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [defaultClientId]);

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (statusFilter !== ALL && t.status !== statusFilter) return false;
      if (priorityFilter !== ALL && t.priority !== priorityFilter) return false;
      if (assigneeFilter === ME && !t.assignees.some((a) => a.id === profile.id)) return false;
      if (
        assigneeFilter !== ALL &&
        assigneeFilter !== ME &&
        !t.assignees.some((a) => a.id === assigneeFilter)
      )
        return false;
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter, priorityFilter, showArchived, profile.id]);

  // Done tasks move out of the active flow into a bulk area at the bottom
  // (still visible, not hidden) — the active list is then sorted so the
  // most urgent tasks lead, nearest deadline breaking ties within a tier.
  const { activeTasks, doneTasks } = useMemo(() => {
    const active: TaskWithRelations[] = [];
    const done: TaskWithRelations[] = [];
    for (const t of filtered) {
      (t.status === "done" ? done : active).push(t);
    }
    active.sort((a, b) => {
      const rankDiff =
        PRIORITY_RANK[b.priority as TaskPriority] - PRIORITY_RANK[a.priority as TaskPriority];
      if (rankDiff !== 0) return rankDiff;
      if (!a.deadline && !b.deadline) return 0;
      if (!a.deadline) return 1;
      if (!b.deadline) return -1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });
    done.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return { activeTasks: active, doneTasks: done };
  }, [filtered]);

  async function handleStatusChange(task: TaskWithRelations, status: TaskStatus) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    logActivity(supabase, {
      actorId: profile.id,
      action: status === "done" ? "task_completed" : "task_status_changed",
      summary:
        status === "done"
          ? `Marked task "${task.title}" as done`
          : `Moved task "${task.title}" to ${statusLabel(status)}`,
      entityType: "task",
      entityId: task.id,
    });
  }

  async function handleAssess(task: TaskWithRelations) {
    setAssessingId(task.id);
    try {
      const res = await fetch("/api/tasks/assess-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: task.title,
          description: task.description,
          task_type: task.task_type,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "AI role assessment failed");
        return;
      }
      const { role } = (await res.json()) as { role: Tables<"profiles">["role"] };
      const assignee = profiles.find((p) => p.role === role);
      if (!assignee) {
        toast.error("No team member found for the suggested role");
        return;
      }
      const supabase = createClient();
      const { error } = await supabase
        .from("tasks")
        .update({ assignee_id: assignee.id })
        .eq("id", task.id);
      if (error) {
        toast.error(error.message);
        return;
      }
      await supabase
        .from("task_assignees")
        .upsert({ task_id: task.id, profile_id: assignee.id }, { onConflict: "task_id,profile_id" });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                assignee_id: assignee.id,
                assignee: { id: assignee.id, full_name: assignee.full_name, role: assignee.role },
                assignees: t.assignees.some((a) => a.id === assignee.id)
                  ? t.assignees
                  : [...t.assignees, { id: assignee.id, full_name: assignee.full_name, role: assignee.role }],
              }
            : t
        )
      );
      toast.success(`AI assigned this task to ${assignee.full_name}`);
    } finally {
      setAssessingId(null);
    }
  }

  async function handleDelete(task: TaskWithRelations) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    toast.success("Task deleted");
    logActivity(supabase, {
      actorId: profile.id,
      action: "task_deleted",
      summary: `Deleted task "${task.title}"`,
      entityType: "task",
      entityId: task.id,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All assignees</SelectItem>
              <SelectItem value={ME}>Assigned to me</SelectItem>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.full_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All priorities</SelectItem>
              {PRIORITIES.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={showArchived}
              onCheckedChange={(checked) => setShowArchived(checked === true)}
            />
            Show archived
          </label>
        </div>

        <TaskForm
          clients={clients}
          profiles={profiles}
          defaultClientId={defaultClientId}
          trigger={<Button>New Task</Button>}
          onSuccess={(task, assigneeIds) =>
            setTasks((prev) => [
              {
                ...task,
                client: clients.find((c) => c.id === task.client_id) ?? null,
                assignee: profiles.find((p) => p.id === task.assignee_id)
                  ? {
                      id: task.assignee_id!,
                      full_name: profiles.find((p) => p.id === task.assignee_id)!.full_name,
                      role: profiles.find((p) => p.id === task.assignee_id)!.role,
                    }
                  : null,
                assignees: resolveAssignees(assigneeIds, profiles),
              },
              ...prev.filter((t) => t.id !== task.id),
            ])
          }
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks match these filters.</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Color</TableHead>
                  <TableHead>Title</TableHead>
                  {showClientColumn && <TableHead>Client</TableHead>}
                  <TableHead>Assignee</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Deadline</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTasks.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={showClientColumn ? 8 : 7}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      Nothing active — everything left matches the filters is done.
                    </TableCell>
                  </TableRow>
                ) : (
                  groupByBatch(activeTasks).map((item) =>
                    item.type === "group"
                      ? renderGroupRow(item.batchId, item.tasks)
                      : renderRow(item.task)
                  )
                )}
              </TableBody>
            </Table>
          </div>

          {doneTasks.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">
                Done ({doneTasks.length})
              </h2>
              <div className="overflow-x-auto rounded-lg border bg-muted/30">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Color</TableHead>
                      <TableHead>Title</TableHead>
                      {showClientColumn && <TableHead>Client</TableHead>}
                      <TableHead>Assignee</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Deadline</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupByBatch(doneTasks).map((item) =>
                      item.type === "group"
                        ? renderGroupRow(item.batchId, item.tasks, { muted: true })
                        : renderRow(item.task, { muted: true })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  function renderGroupRow(
    batchId: string,
    groupTasks: TaskWithRelations[],
    options?: { muted?: boolean }
  ) {
    const muted = options?.muted ?? false;
    const expanded = expandedBatches.has(batchId);
    const first = groupTasks[0];
    const clientGroupId = clients.find((c) => c.id === first.client_id)?.group_id;
    const groupName = clientGroupId ? groups.find((g) => g.id === clientGroupId)?.name : undefined;
    const label = groupName ? `All ${groupName}` : "All locations";
    const doneCount = groupTasks.filter((t) => t.status === "done").length;
    const uniqueAssignees = Array.from(
      new Map(groupTasks.flatMap((t) => t.assignees).map((a) => [a.id, a])).values()
    );
    const priorities = new Set(groupTasks.map((t) => t.priority));
    const sharedPriority = priorities.size === 1 ? (first.priority as TaskPriority) : null;

    return (
      <Fragment key={`group-${batchId}`}>
        <TableRow className={cn("bg-muted/40", muted && "opacity-70")}>
          <TableCell>
            <Layers className="h-4 w-4 text-muted-foreground" aria-hidden />
          </TableCell>
          <TableCell className="font-medium">
            <button
              type="button"
              onClick={() => toggleBatch(batchId)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 hover:bg-muted/60"
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0" aria-hidden />
              )}
              {first.title}
            </button>
          </TableCell>
          {showClientColumn && (
            <TableCell className="text-muted-foreground">
              {label} ({groupTasks.length})
            </TableCell>
          )}
          <TableCell className="text-muted-foreground">
            {uniqueAssignees.length > 0 ? uniqueAssignees.map((a) => a.full_name).join(", ") : "Unassigned"}
          </TableCell>
          <TableCell>
            {sharedPriority ? (
              <Badge className={PRIORITY_BADGE_CLASS[sharedPriority]}>{priorityLabel(sharedPriority)}</Badge>
            ) : (
              <Badge variant="secondary">Mixed</Badge>
            )}
          </TableCell>
          <TableCell className="text-muted-foreground">
            {doneCount}/{groupTasks.length} done
          </TableCell>
          <TableCell className="text-muted-foreground">{formatDeadline(first.deadline)}</TableCell>
          <TableCell className="text-right">
            <Button variant="outline" size="sm" onClick={() => toggleBatch(batchId)}>
              {expanded ? "Collapse" : "Expand"}
            </Button>
          </TableCell>
        </TableRow>
        {expanded && groupTasks.map((t) => renderRow(t, { muted, nested: true }))}
      </Fragment>
    );
  }

  function renderRow(task: TaskWithRelations, options?: { muted?: boolean; nested?: boolean }) {
    const muted = options?.muted ?? false;
    const nested = options?.nested ?? false;
    const color = taskColor(task.priority as TaskPriority, task.assignee?.role);
    const flagUrgent = !muted && isLongUrgent(task);

    return (
      <TableRow key={task.id} className={cn(muted && "opacity-70", nested && "bg-muted/10")}>
        <TableCell>
          {color ? (
            <TaskColorDot color={color} title={TASK_COLOR_LABEL[color]} />
          ) : (
            <button
              type="button"
              onClick={() => handleAssess(task)}
              disabled={assessingId === task.id}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
              title="Needs AI assessment — click to assign a role"
            >
              <span
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground"
                aria-hidden
              />
              {assessingId === task.id ? "Assessing…" : "Assess"}
            </button>
          )}
        </TableCell>
        <TableCell className="font-medium">
          <div
            role="button"
            tabIndex={0}
            onClick={() => setOpenTaskId(task.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setOpenTaskId(task.id);
              }
            }}
            className={cn(
              "inline-flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 hover:bg-muted/60",
              nested && "ml-4",
              flagUrgent && "urgent-stroke"
            )}
            title={flagUrgent ? "Urgent for more than 24 hours" : undefined}
          >
            {task.title}
            {task.source === "client" && (
              <Badge variant="secondary" className="shrink-0">
                Client request
              </Badge>
            )}
          </div>
        </TableCell>
        {showClientColumn && (
          <TableCell className="text-muted-foreground">{task.client?.name ?? "—"}</TableCell>
        )}
        <TableCell className="text-muted-foreground">
          {task.assignees.length > 0
            ? task.assignees.map((a) => a.full_name).join(", ")
            : "Unassigned"}
        </TableCell>
        <TableCell>
          <Badge className={PRIORITY_BADGE_CLASS[task.priority as TaskPriority]}>
            {priorityLabel(task.priority as TaskPriority)}
          </Badge>
        </TableCell>
        <TableCell>
          <Select
            value={task.status}
            onValueChange={(v) => handleStatusChange(task, v as TaskStatus)}
          >
            <SelectTrigger className="h-8 w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell className="text-muted-foreground">{formatDeadline(task.deadline)}</TableCell>
        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenTaskId(task.id)}>
              Edit
            </Button>
            <TaskForm
              task={task}
              clients={clients}
              profiles={profiles}
              defaultClientId={defaultClientId}
              open={openTaskId === task.id}
              onOpenChange={(v) => setOpenTaskId(v ? task.id : null)}
              onSuccess={(updated, assigneeIds) =>
                setTasks((prev) =>
                  prev.map((t) =>
                    t.id === updated.id
                      ? {
                          ...updated,
                          client: clients.find((c) => c.id === updated.client_id) ?? null,
                          assignee: profiles.find((p) => p.id === updated.assignee_id)
                            ? {
                                id: updated.assignee_id!,
                                full_name: profiles.find((p) => p.id === updated.assignee_id)!
                                  .full_name,
                                role: profiles.find((p) => p.id === updated.assignee_id)!.role,
                              }
                            : null,
                          assignees: resolveAssignees(assigneeIds, profiles),
                        }
                      : t
                  )
                )
              }
              onDelete={(deletedId) => setTasks((prev) => prev.filter((t) => t.id !== deletedId))}
            />
            {leader && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(task)}>
                Delete
              </Button>
            )}
          </div>
        </TableCell>
      </TableRow>
    );
  }
}
