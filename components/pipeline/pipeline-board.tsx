"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import {
  PRIORITIES,
  STATUSES,
  PRIORITY_BADGE_CLASS,
  STATUS_BADGE_CLASS,
  priorityLabel,
  statusLabel,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks/constants";
import { TaskForm } from "@/components/pipeline/task-form";
import { TaskColorDot } from "@/components/tasks/task-color-dot";
import { taskColor, TASK_COLOR_LABEL } from "@/lib/tasks/color-code";
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

export type TaskWithRelations = Tables<"tasks"> & {
  client: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; role: Tables<"profiles">["role"] } | null;
};

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
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role">[];
  defaultClientId?: string;
  showClientColumn?: boolean;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const [tasks, setTasks] = useState(initialTasks);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [assigneeFilter, setAssigneeFilter] = useState<string>(leader ? ALL : ME);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [showArchived, setShowArchived] = useState(false);
  const [assessingId, setAssessingId] = useState<string | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      let query = supabase
        .from("tasks")
        .select("*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role)")
        .order("created_at", { ascending: false });
      if (defaultClientId) {
        query = query.eq("client_id", defaultClientId);
      }
      const { data } = await query;
      if (data) setTasks(data as unknown as TaskWithRelations[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      channel = supabase
        .channel(`tasks-board-${defaultClientId ?? "all"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
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
      if (assigneeFilter === ME && t.assignee_id !== profile.id) return false;
      if (assigneeFilter !== ALL && assigneeFilter !== ME && t.assignee_id !== assigneeFilter)
        return false;
      return true;
    });
  }, [tasks, statusFilter, assigneeFilter, priorityFilter, showArchived, profile.id]);

  function canEdit(task: TaskWithRelations) {
    return leader || task.assignee_id === profile.id;
  }

  async function handleStatusChange(task: TaskWithRelations, status: TaskStatus) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
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
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, assignee_id: assignee.id, assignee: { id: assignee.id, full_name: assignee.full_name, role: assignee.role } }
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
          onSuccess={(task) =>
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
              },
              ...prev.filter((t) => t.id !== task.id),
            ])
          }
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
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
              {filtered.map((task) => {
                const color = taskColor(task.priority as TaskPriority, task.assignee?.role);
                return (
                <TableRow key={task.id}>
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
                          className="inline-block h-2.5 w-2.5 shrink-0 rounded-full border border-dashed border-gray-400"
                          aria-hidden
                        />
                        {assessingId === task.id ? "Assessing…" : "Assess"}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{task.title}</TableCell>
                  {showClientColumn && (
                    <TableCell className="text-muted-foreground">
                      {task.client?.name ?? "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">
                    {task.assignee?.full_name ?? "Unassigned"}
                  </TableCell>
                  <TableCell>
                    <Badge className={PRIORITY_BADGE_CLASS[task.priority as TaskPriority]}>
                      {priorityLabel(task.priority as TaskPriority)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {canEdit(task) ? (
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
                    ) : (
                      <Badge className={STATUS_BADGE_CLASS[task.status as TaskStatus]}>
                        {statusLabel(task.status as TaskStatus)}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDeadline(task.deadline)}
                  </TableCell>
                  <TableCell className="text-right">
                    {canEdit(task) && (
                      <div className="flex justify-end gap-2">
                        <TaskForm
                          task={task}
                          clients={clients}
                          profiles={profiles}
                          defaultClientId={defaultClientId}
                          trigger={
                            <Button variant="outline" size="sm">
                              Edit
                            </Button>
                          }
                          onSuccess={(updated) =>
                            setTasks((prev) =>
                              prev.map((t) =>
                                t.id === updated.id
                                  ? {
                                      ...updated,
                                      client:
                                        clients.find((c) => c.id === updated.client_id) ?? null,
                                      assignee:
                                        profiles.find((p) => p.id === updated.assignee_id)
                                          ? {
                                              id: updated.assignee_id!,
                                              full_name: profiles.find(
                                                (p) => p.id === updated.assignee_id
                                              )!.full_name,
                                              role: profiles.find(
                                                (p) => p.id === updated.assignee_id
                                              )!.role,
                                            }
                                          : null,
                                    }
                                  : t
                              )
                            )
                          }
                          onDelete={(deletedId) =>
                            setTasks((prev) => prev.filter((t) => t.id !== deletedId))
                          }
                        />
                        {leader && (
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(task)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
