"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import {
  PRIORITY_BADGE_CLASS,
  STATUSES,
  priorityLabel,
  type TaskStatus,
} from "@/lib/tasks/constants";
import { TaskForm } from "@/components/pipeline/task-form";
import { TaskQuickEdit } from "@/components/pipeline/task-quick-edit";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type MyDayTask = Tables<"tasks"> & { client: { id: string; name: string } | null };

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDeadline(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function byDeadline(a: MyDayTask, b: MyDayTask): number {
  if (!a.deadline && !b.deadline) return 0;
  if (!a.deadline) return 1;
  if (!b.deadline) return -1;
  return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
}

export function MyDayBoard({
  initialTasks,
  clients,
  profiles,
}: {
  initialTasks: MyDayTask[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_external">[];
}) {
  const profile = useUser();
  const [tasks, setTasks] = useState(initialTasks);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [showBacklog, setShowBacklog] = useState(false);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("task_assignees")
        .select("tasks!inner(*, client:clients!tasks_client_id_fkey(id, name))")
        .eq("profile_id", profile.id)
        .eq("tasks.archived", false)
        .neq("tasks.status", "done");
      const rows = (data ?? []) as unknown as { tasks: MyDayTask }[];
      setTasks(rows.map((row) => row.tasks));
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      channel = supabase
        .channel("my-day-board")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [profile.id]);

  const { bounties, overdue, dueToday, dueThisWeek, backlog } = useMemo(() => {
    const today = startOfToday();
    const todayEnd = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const weekEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const now = new Date();

    const bounties: MyDayTask[] = [];
    const overdue: MyDayTask[] = [];
    const dueToday: MyDayTask[] = [];
    const dueThisWeek: MyDayTask[] = [];
    const backlog: MyDayTask[] = [];

    for (const t of tasks) {
      if (t.is_special) {
        bounties.push(t);
        continue;
      }
      if (!t.deadline) {
        backlog.push(t);
        continue;
      }
      const deadline = new Date(t.deadline);
      if (deadline < now) {
        overdue.push(t);
      } else if (deadline < todayEnd) {
        dueToday.push(t);
      } else if (deadline < weekEnd) {
        dueThisWeek.push(t);
      } else {
        backlog.push(t);
      }
    }

    overdue.sort(byDeadline);
    dueToday.sort(byDeadline);
    dueThisWeek.sort(byDeadline);

    return { bounties, overdue, dueToday, dueThisWeek, backlog };
  }, [tasks]);

  async function handleStatusChange(task: MyDayTask, status: TaskStatus) {
    const supabase = createClient();
    const previous = task.status;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status } : t)));
    const { error } = await supabase.from("tasks").update({ status }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: previous } : t)));
    }
  }

  function mergeUpdatedTask(updated: Tables<"tasks">): MyDayTask {
    return { ...updated, client: clients.find((c) => c.id === updated.client_id) ?? null };
  }

  function renderRow(task: MyDayTask, options?: { urgent?: boolean }) {
    return (
      <div
        key={task.id}
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3"
      >
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setOpenTaskId(task.id)}
            className="text-left font-medium hover:underline"
          >
            {task.title}
          </button>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {task.client && <span>{task.client.name}</span>}
            <Badge className={PRIORITY_BADGE_CLASS[task.priority]}>{priorityLabel(task.priority)}</Badge>
            {task.deadline && (
              <span className={options?.urgent ? "font-medium text-destructive" : undefined}>
                {formatDeadline(task.deadline)}
              </span>
            )}
            {task.is_special && task.payout_amount != null && (
              <Badge variant="secondary">{task.payout_amount.toLocaleString()} kr bounty</Badge>
            )}
          </div>
        </div>
        <Select value={task.status} onValueChange={(v) => handleStatusChange(task, v as TaskStatus)}>
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
        <TaskForm
          task={task}
          clients={clients}
          profiles={profiles}
          open={openTaskId === task.id}
          onOpenChange={(open) => setOpenTaskId(open ? task.id : null)}
          onSuccess={(updated) =>
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? mergeUpdatedTask(updated) : t)))
          }
          onDelete={(id) => setTasks((prev) => prev.filter((t) => t.id !== id))}
        />
        <TaskQuickEdit
          task={task}
          clients={clients}
          profiles={profiles}
          onUpdate={(updated) =>
            setTasks((prev) => prev.map((t) => (t.id === updated.id ? mergeUpdatedTask(updated) : t)))
          }
        />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">Nothing on your plate right now — nice work.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {bounties.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Bounties ({bounties.length})</h2>
          <div className="space-y-2">{bounties.map((t) => renderRow(t))}</div>
        </section>
      )}

      {overdue.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-destructive">Overdue ({overdue.length})</h2>
          <div className="space-y-2">{overdue.map((t) => renderRow(t, { urgent: true }))}</div>
        </section>
      )}

      {dueToday.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Due today ({dueToday.length})</h2>
          <div className="space-y-2">{dueToday.map((t) => renderRow(t))}</div>
        </section>
      )}

      {dueThisWeek.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Due this week ({dueThisWeek.length})
          </h2>
          <div className="space-y-2">{dueThisWeek.map((t) => renderRow(t))}</div>
        </section>
      )}

      {backlog.length > 0 && (
        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowBacklog((v) => !v)}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            {showBacklog ? "Hide" : "Show"} backlog ({backlog.length})
          </button>
          {showBacklog && <div className="space-y-2">{backlog.map((t) => renderRow(t))}</div>}
        </section>
      )}
    </div>
  );
}
