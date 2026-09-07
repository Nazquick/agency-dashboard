"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import {
  STATUSES,
  STATUS_BADGE_CLASS,
  CONTENT_TYPES,
  PRIORITIES,
  contentTypeLabel,
  statusLabel,
  type TaskStatus,
} from "@/lib/tasks/constants";
import { leadTimeViolation } from "@/lib/tasks/lead-time";
import type { Tables } from "@/lib/types/database.types";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const ALL = "__all__";
const NONE = "__none__";

const editSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type EditFormValues = z.infer<typeof editSchema>;

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type PortalTask = Tables<"tasks"> & { client: { id: string; name: string } | null };

function taskTypeLabel(value: string | null): string {
  if (!value) return "—";
  return contentTypeLabel(value);
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

export function ClientPipelineTable({
  initialTasks,
  clients,
}: {
  initialTasks: PortalTask[];
  clients: { id: string; name: string }[];
}) {
  const profile = useUser();
  const [tasks, setTasks] = useState(initialTasks);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<TaskStatus>>(
    new Set(STATUSES.map((s) => s.value))
  );
  const [locationFilter, setLocationFilter] = useState<string>(ALL);
  const [selectedTask, setSelectedTask] = useState<PortalTask | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sortMode, setSortMode] = useState<"deadline" | "recent">("deadline");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const showLocation = clients.length > 1;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: { title: "", description: "", task_type: undefined, deadline: "", priority: "medium" },
  });

  function startEditing(task: PortalTask) {
    reset({
      title: task.title,
      description: task.description ?? "",
      task_type: task.task_type ?? undefined,
      deadline: toDatetimeLocal(task.deadline),
      priority: task.priority,
    });
    setEditing(true);
  }

  function closeDialog(open: boolean) {
    if (!open) {
      setSelectedTask(null);
      setEditing(false);
    }
  }

  async function handleSaveEdit(values: EditFormValues) {
    if (!selectedTask) return;
    const deadlineIso = values.deadline ? new Date(values.deadline).toISOString() : null;
    const violation = leadTimeViolation(values.task_type, deadlineIso, true);
    if (violation) {
      toast.error(violation);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("tasks")
      .update({
        title: values.title,
        description: values.description || null,
        task_type: values.task_type || null,
        deadline: deadlineIso,
        priority: values.priority,
      })
      .eq("id", selectedTask.id)
      .select("*, client:clients!tasks_client_id_fkey(id, name)")
      .single();
    setSaving(false);

    if (error || !data) {
      toast.error(error?.message ?? "Failed to update task");
      return;
    }

    const updated = data as unknown as PortalTask;
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTask(updated);
    setEditing(false);
    toast.success("Task updated");
    logActivity(supabase, {
      actorId: profile.id,
      action: "task_updated",
      summary: `${profile.full_name} updated task "${updated.title}"`,
      entityType: "task",
      entityId: updated.id,
    });
  }

  async function handleRemove(task: PortalTask) {
    if (!window.confirm(`Remove "${task.title}" from the pipeline? The team can still restore it.`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ archived: true }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    setSelectedTask(null);
    toast.success("Task removed");
    logActivity(supabase, {
      actorId: profile.id,
      action: "task_archived",
      summary: `${profile.full_name} removed task "${task.title}"`,
      entityType: "task",
      entityId: task.id,
    });
  }

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("tasks")
        .select("*, client:clients!tasks_client_id_fkey(id, name)")
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (data) setTasks(data as unknown as PortalTask[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      channel = supabase
        .channel("portal-pipeline")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Every filter except the status toggles — used both for the
  // status-toggled list below and to count each status chip, so a chip's
  // own count doesn't drop to 0 just because it's switched off.
  const preStatusFiltered = useMemo(() => {
    return tasks.filter((t) => {
      if (locationFilter !== ALL && t.client_id !== locationFilter) return false;
      return true;
    });
  }, [tasks, locationFilter]);

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

  const statusGroups = useMemo(() => {
    const groups = {} as Record<TaskStatus, PortalTask[]>;
    for (const s of STATUSES) {
      const members = filtered.filter((t) => t.status === s.value);
      if (sortMode === "recent") {
        members.sort((a, b) => {
          const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
          return sortDir === "desc" ? diff : -diff;
        });
      } else {
        members.sort((a, b) => {
          if (s.value === "done") {
            return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
          }
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

  function toggleStatus(status: TaskStatus) {
    setVisibleStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  function handleRecentSortClick() {
    if (sortMode !== "recent") {
      setSortMode("recent");
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Everything the team is working on for you.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {showLocation && (
            <Select value={locationFilter} onValueChange={setLocationFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All locations</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setSortMode("deadline")}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                sortMode === "deadline"
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Deadline
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
          </div>
        </div>
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
            return (
              <div key={s.value} className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {s.label} ({group.length})
                </h2>
                <div
                  className={cn(
                    "overflow-x-auto rounded-lg border bg-card",
                    s.value === "done" && "bg-muted/30"
                  )}
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {showLocation && <TableHead>Location</TableHead>}
                        <TableHead>Title</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.map((task) => (
                        <TableRow
                          key={task.id}
                          className={cn("cursor-pointer", s.value === "done" && "opacity-70")}
                          onClick={() => setSelectedTask(task)}
                        >
                          {showLocation && (
                            <TableCell className="text-muted-foreground">
                              {task.client?.name ?? "—"}
                            </TableCell>
                          )}
                          <TableCell className="font-medium">{task.title}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {taskTypeLabel(task.task_type)}
                          </TableCell>
                          <TableCell>
                            <Badge className={STATUS_BADGE_CLASS[task.status as TaskStatus]}>
                              {statusLabel(task.status as TaskStatus)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDeadline(task.deadline)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={selectedTask !== null} onOpenChange={closeDialog}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedTask && (() => {
            const canModify = selectedTask.status !== "done";
            return editing ? (
              <>
                <DialogHeader>
                  <DialogTitle>Edit task</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit(handleSaveEdit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="edit-title">Title</Label>
                    <Input id="edit-title" {...register("title")} />
                    {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-description">Description</Label>
                    <Textarea id="edit-description" rows={4} {...register("description")} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Controller
                        name="task_type"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value ?? NONE}
                            onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>None</SelectItem>
                              {CONTENT_TYPES.map((t) => (
                                <SelectItem key={t.value} value={t.value}>
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Controller
                        name="priority"
                        control={control}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PRIORITIES.map((p) => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="edit-deadline">Deadline</Label>
                    <Input id="edit-deadline" type="datetime-local" {...register("deadline")} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" className="flex-1" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={saving} className="flex-1">
                      {saving ? "Saving…" : "Save changes"}
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedTask.title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={STATUS_BADGE_CLASS[selectedTask.status as TaskStatus]}>
                      {statusLabel(selectedTask.status as TaskStatus)}
                    </Badge>
                    {showLocation && selectedTask.client && (
                      <span className="text-sm text-muted-foreground">{selectedTask.client.name}</span>
                    )}
                    <span className="text-sm text-muted-foreground">
                      {taskTypeLabel(selectedTask.task_type)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Due {formatDeadline(selectedTask.deadline)}
                    </span>
                  </div>
                  {selectedTask.description && (
                    <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                  )}
                  {canModify && (
                    <div className="flex gap-2 border-t pt-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => startEditing(selectedTask)}
                      >
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRemove(selectedTask)}
                      >
                        Remove
                      </Button>
                    </div>
                  )}
                  <TaskAttachments taskId={selectedTask.id} taskTitle={selectedTask.title} />
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
