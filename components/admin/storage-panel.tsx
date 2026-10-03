"use client";

import { useMemo, useState } from "react";
import { STATUSES, STATUS_BADGE_CLASS, statusLabel, type TaskStatus } from "@/lib/tasks/constants";
import type { Json, Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type StorageTask = Pick<
  Tables<"tasks">,
  | "id"
  | "title"
  | "description"
  | "status"
  | "priority"
  | "task_type"
  | "deadline"
  | "created_at"
  | "updated_at"
> & {
  client: { id: string; name: string } | null;
  assignee: { full_name: string } | null;
};

export type StorageDeletion = Tables<"task_deletions"> & {
  deleter: { full_name: string } | null;
};

type View = "archived" | "deleted";
type StatusFilter = "all" | "done" | "open";

const ALL_CLIENTS = "__all__";

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function snapField(snapshot: Json | null, key: string): string | null {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return null;
  const value = snapshot[key];
  return typeof value === "string" ? value : null;
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status || !(status in STATUS_BADGE_CLASS)) return null;
  return (
    <Badge className={STATUS_BADGE_CLASS[status as TaskStatus]} variant="secondary">
      {statusLabel(status as TaskStatus)}
    </Badge>
  );
}

function Detail({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

export function StoragePanel({
  archivedTasks,
  deletedTasks,
}: {
  archivedTasks: StorageTask[];
  deletedTasks: StorageDeletion[];
}) {
  const [view, setView] = useState<View>("archived");
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState(ALL_CLIENTS);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const clientNames = useMemo(() => {
    const names = new Set<string>();
    if (view === "archived") {
      for (const t of archivedTasks) if (t.client) names.add(t.client.name.trim());
    } else {
      for (const d of deletedTasks) if (d.client_name) names.add(d.client_name.trim());
    }
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [view, archivedTasks, deletedTasks]);

  const query = search.trim().toLowerCase();

  const archivedRows = useMemo(
    () =>
      archivedTasks.filter((t) => {
        if (query && !t.title.toLowerCase().includes(query)) return false;
        if (clientFilter !== ALL_CLIENTS && t.client?.name.trim() !== clientFilter) return false;
        if (statusFilter === "done" && t.status !== "done") return false;
        if (statusFilter === "open" && t.status === "done") return false;
        return true;
      }),
    [archivedTasks, query, clientFilter, statusFilter]
  );

  const deletedRows = useMemo(
    () =>
      deletedTasks.filter((d) => {
        if (query && !d.title.toLowerCase().includes(query)) return false;
        if (clientFilter !== ALL_CLIENTS && d.client_name?.trim() !== clientFilter) return false;
        return true;
      }),
    [deletedTasks, query, clientFilter]
  );

  function switchView(next: View) {
    setView(next);
    setClientFilter(ALL_CLIENTS);
    setStatusFilter("all");
    setExpanded(null);
  }

  const doneCount = archivedRows.filter((t) => t.status === "done").length;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Every task that&apos;s been archived or deleted stays here permanently — including all work
        from clients you&apos;ve removed.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={view === "archived" ? "default" : "outline"}
          onClick={() => switchView("archived")}
        >
          Archived tasks ({archivedTasks.length})
        </Button>
        <Button
          size="sm"
          variant={view === "deleted" ? "default" : "outline"}
          onClick={() => switchView("deleted")}
        >
          Deleted tasks ({deletedTasks.length})
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title"
          className="w-full sm:w-56"
        />
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLIENTS}>All clients</SelectItem>
            {clientNames.map((name) => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {view === "archived" && (
          <div className="flex gap-1">
            {(
              [
                ["all", "All"],
                ["done", "Done"],
                ["open", "Not done"],
              ] as const
            ).map(([value, label]) => (
              <Button
                key={value}
                size="sm"
                variant={statusFilter === value ? "secondary" : "ghost"}
                onClick={() => setStatusFilter(value)}
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {view === "archived" ? (
        <>
          <p className="text-xs text-muted-foreground">
            {archivedRows.length} {archivedRows.length === 1 ? "task" : "tasks"} · {doneCount} done
          </p>
          {archivedRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {archivedRows.map((t) => {
                const open = expanded === t.id;
                const statusOptionLabel = STATUSES.find((s) => s.value === t.status)?.label;
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : t.id)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{t.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {t.client?.name.trim() ?? "No client"} · {fmt(t.created_at)}
                        </p>
                      </div>
                      <StatusBadge status={t.status} />
                    </button>
                    {open && (
                      <dl className="grid grid-cols-2 gap-3 border-t bg-muted/30 px-3 py-3">
                        <Detail label="Status" value={statusOptionLabel ?? t.status} />
                        <Detail label="Type" value={t.task_type} />
                        <Detail label="Assigned to" value={t.assignee?.full_name ?? null} />
                        <Detail label="Priority" value={t.priority} />
                        <Detail label="Created" value={fmt(t.created_at)} />
                        <Detail label="Last updated" value={fmt(t.updated_at)} />
                        <Detail label="Deadline" value={t.deadline ? fmt(t.deadline) : null} />
                        <div className="col-span-2">
                          <Detail label="Description" value={t.description} />
                        </div>
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {deletedRows.length} {deletedRows.length === 1 ? "task" : "tasks"}
          </p>
          {deletedRows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Nothing matches.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {deletedRows.map((d) => {
                const open = expanded === d.id;
                const status = snapField(d.snapshot, "status");
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : d.id)}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.client_name?.trim() ?? "Client unknown"} · deleted {fmt(d.deleted_at)}
                          {d.deleter ? ` by ${d.deleter.full_name}` : ""}
                        </p>
                      </div>
                      <StatusBadge status={status} />
                    </button>
                    {open && (
                      <dl className="grid grid-cols-2 gap-3 border-t bg-muted/30 px-3 py-3">
                        {d.snapshot ? (
                          <>
                            <Detail label="Type" value={snapField(d.snapshot, "task_type")} />
                            <Detail label="Priority" value={snapField(d.snapshot, "priority")} />
                            <Detail label="Created" value={fmt(snapField(d.snapshot, "created_at"))} />
                            <Detail label="Deadline" value={fmt(snapField(d.snapshot, "deadline"))} />
                            <div className="col-span-2">
                              <Detail label="Description" value={snapField(d.snapshot, "description")} />
                            </div>
                          </>
                        ) : (
                          <p className="col-span-2 text-xs text-muted-foreground">
                            Deleted before Storage existed — only the title, who deleted it, and when were
                            recorded.
                          </p>
                        )}
                      </dl>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
