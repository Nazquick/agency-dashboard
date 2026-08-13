"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
const GROUP_PREFIX = "group:";

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
  const [visibleStatuses, setVisibleStatuses] = useState<Set<TaskStatus>>(
    new Set(STATUSES.map((s) => s.value))
  );
  const [assigneeFilter, setAssigneeFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [clientFilter, setClientFilter] = useState<string>(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const [sortMode, setSortMode] = useState<"priority" | "recent">("priority");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [assessingId, setAssessingId] = useState<string | null>(null);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [tasksWithFiles, setTasksWithFiles] = useState<Set<string>>(new Set());
  const [showFilesOnly, setShowFilesOnly] = useState(false);

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

    async function refetchFileTaskIds() {
      const { data } = await supabase.from("task_attachments").select("task_id");
      if (data) setTasksWithFiles(new Set(data.map((row) => row.task_id)));
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      await refetchFileTaskIds();

      channel = supabase
        .channel(`tasks-board-${defaultClientId ?? "all"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, refetchFileTaskIds)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [defaultClientId]);

  // Every filter except the status toggles — used both to build the
  // status-toggled list below and to count each status chip, so a chip's
  // own count doesn't drop to 0 just because it's switched off.
  const preStatusFiltered = useMemo(() => {
    return tasks.filter((t) => {
      if (!showArchived && t.archived) return false;
      if (priorityFilter !== ALL && t.priority !== priorityFilter) return false;
      if (assigneeFilter === ME && !t.assignees.some((a) => a.id === profile.id)) return false;
      if (
        assigneeFilter !== ALL &&
        assigneeFilter !== ME &&
        !t.assignees.some((a) => a.id === assigneeFilter)
      )
        return false;
      if (clientFilter !== ALL) {
        if (clientFilter.startsWith(GROUP_PREFIX)) {
          const groupId = clientFilter.slice(GROUP_PREFIX.length);
          const client = clients.find((c) => c.id === t.client_id);
          if (!client || client.group_id !== groupId) return false;
        } else if (t.client_id !== clientFilter) {
          return false;
        }
      }
      if (showFilesOnly && !tasksWithFiles.has(t.id)) return false;
      return true;
    });
  }, [
    tasks,
    clients,
    assigneeFilter,
    priorityFilter,
    clientFilter,
    showArchived,
    showFilesOnly,
    tasksWithFiles,
    profile.id,
  ]);

  const statusCounts = useMemo(() => {
    const counts = {} as Record<TaskStatus, number>;
    for (const s of STATUSES) counts[s.value] = 0;
    for (const t of preStatusFiltered) counts[t.status as TaskStatus]++;
    return counts;
  }, [preStatusFiltered]);

  const filtered = useMemo(
    () => preStatusFiltered.filter((t) => visibleStatuses.has(t.status as TaskStatus)),
    [preStatusFiltered, visibleStatuses]
  );

  // Grouped by status so every status can be seen at once (toggled via the
  // chips below) instead of one flat list. Within each group: by default,
  // the most urgent tasks lead (nearest deadline breaking ties), except
  // "done" which sorts by most-recently-completed first — or, when
  // sortMode is "recent", every group instead sorts by created_at, newest
  // or oldest first per sortDir.
  const statusGroups = useMemo(() => {
    const groups = {} as Record<TaskStatus, TaskWithRelations[]>;
    for (const s of STATUSES) {
      const members = filtered.filter((t) => t.status === s.value);
      if (sortMode === "recent") {
        members.sort((a, b) => {
          const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return sortDir === "desc" ? diff : -diff;
        });
      } else if (s.value === "done") {
        members.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      } else {
        members.sort((a, b) => {
          const rankDiff =
            PRIORITY_RANK[b.priority as TaskPriority] - PRIORITY_RANK[a.priority as TaskPriority];
          if (rankDiff !== 0) return rankDiff;
          if (!a.deadline && !b.deadline) return 0;
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
        });
      }
      groups[s.value] = members;
    }
    return groups;
  }, [filtered, sortMode, sortDir]);

  function handleRecentSortClick() {
    if (sortMode !== "recent") {
      setSortMode("recent");
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  }

  function toggleStatus(status: TaskStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

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
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => {
              const active = visibleStatuses.has(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => toggleStatus(s.value)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {s.label} ({statusCounts[s.value]})
                </button>
              );
            })}
          </div>

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

          {showClientColumn && (
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All clients</SelectItem>
                {groups
                  .filter((g) => clients.some((c) => c.group_id === g.id))
                  .map((g) => (
                    <SelectItem key={g.id} value={`${GROUP_PREFIX}${g.id}`}>
                      {g.name} (ALL)
                    </SelectItem>
                  ))}
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSortMode("priority")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sortMode === "priority"
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Priority
            </button>
            <button
              type="button"
              onClick={handleRecentSortClick}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sortMode === "recent"
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Recently added{sortMode === "recent" && (sortDir === "desc" ? " ↓" : " ↑")}
            </button>
            <button
              type="button"
              onClick={() => setShowFilesOnly((v) => !v)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                showFilesOnly
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Files
            </button>
          </div>

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
        <div className="space-y-6">
          {STATUSES.filter((s) => visibleStatuses.has(s.value)).map((s) => {
            const group = statusGroups[s.value];
            if (group.length === 0) return null;
            const muted = s.value === "done";
            return (
              <div key={s.value} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {s.label} ({group.length})
                </h2>
                <div
                  className={cn(
                    "overflow-x-auto rounded-lg border bg-card",
                    muted && "bg-muted/30"
                  )}
                >
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
                    <TableBody>{group.map((task) => renderRow(task, { muted }))}</TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

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
          <TableCell className="text-muted-foreground">
            {task.client_group_id ? (
              <div>
                <div>{groups.find((g) => g.id === task.client_group_id)?.name ?? "Group"} (ALL)</div>
                <div className="text-xs">{task.client?.name}</div>
              </div>
            ) : (
              (task.client?.name ?? "—")
            )}
          </TableCell>
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
