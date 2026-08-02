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
import { Badge } from "@/components/ui/badge";
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
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [locationFilter, setLocationFilter] = useState<string>(ALL);
  const showLocation = clients.length > 1;

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("tasks")
        .select("*, client:clients(id, name)")
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

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      if (statusFilter !== ALL && t.status !== statusFilter) return false;
      if (locationFilter !== ALL && t.client_id !== locationFilter) return false;
      return true;
    });
  }, [tasks, statusFilter, locationFilter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pipeline</h1>
          <p className="text-sm text-muted-foreground">Everything the team is working on for you.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No tasks match these filters.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border bg-card">
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
              {filtered.map((task) => (
                <TableRow key={task.id}>
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
      )}
    </div>
  );
}
