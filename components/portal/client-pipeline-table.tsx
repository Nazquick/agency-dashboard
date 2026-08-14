"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import {
  STATUSES,
  STATUS_BADGE_CLASS,
  contentTypeLabel,
  statusLabel,
  type TaskStatus,
} from "@/lib/tasks/constants";
import type { Tables } from "@/lib/types/database.types";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import { Badge } from "@/components/ui/badge";
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
  const [tasks, setTasks] = useState(initialTasks);
  const [visibleStatuses, setVisibleStatuses] = useState<Set<TaskStatus>>(
    new Set(STATUSES.map((s) => s.value))
  );
  const [locationFilter, setLocationFilter] = useState<string>(ALL);
  const [selectedTask, setSelectedTask] = useState<PortalTask | null>(null);
  const [sortMode, setSortMode] = useState<"deadline" | "recent">("deadline");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const showLocation = clients.length > 1;

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("tasks")
        .select("*, client:clients!tasks_client_id_fkey(id, name)")
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

      <Dialog open={selectedTask !== null} onOpenChange={(open) => !open && setSelectedTask(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedTask && (
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
                <TaskAttachments taskId={selectedTask.id} taskTitle={selectedTask.title} />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
