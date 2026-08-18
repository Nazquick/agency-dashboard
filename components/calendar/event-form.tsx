"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { findConflicts, type ConflictingEvent } from "@/lib/calendar/conflicts";
import { EVENT_TYPES } from "@/lib/calendar/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConflictWarning } from "@/components/calendar/conflict-warning";

const NONE = "__none__";
const ONE_HOUR_MS = 60 * 60 * 1000;

const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    event_type: z.enum(["meeting", "shoot", "deadline", "deliverable", "other"]),
    client_id: z.string().optional(),
    starts_at: z.string().min(1, "Start time is required"),
    ends_at: z.string().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: "End must be after start",
    path: ["ends_at"],
  });

type EventFormValues = z.infer<typeof eventSchema>;

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A new event defaults to 9am on the given day (or today, if no day was
// picked) — never blank, so the form is fillable without hunting for a date.
function defaultCreateStartValue(defaultStartDate?: Date): string {
  const base = defaultStartDate ?? new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base.getFullYear()}-${pad(base.getMonth() + 1)}-${pad(base.getDate())}T09:00`;
}

export function EventForm({
  event,
  clients,
  profiles,
  defaultClientId,
  defaultAssigneeId,
  defaultStartDate,
  trigger,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  onSuccess,
}: {
  event?: Tables<"calendar_events">;
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name">[];
  defaultClientId?: string;
  defaultAssigneeId?: string;
  // The day a new event should default to (e.g. the day double-clicked on
  // the calendar) — ignored when editing an existing event. Defaults to
  // today, always at 9am, when omitted.
  defaultStartDate?: Date;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  // savedRows: the group's current rows after the save. removedAssigneeRowIds:
  // sibling rows deleted because that assignee was unchecked — the caller
  // needs both to reconcile local state (upsert the former, drop the latter).
  onSuccess?: (savedRows: Tables<"calendar_events">[], removedAssigneeRowIds: string[]) => void;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen ?? internalOpen;
  const setOpen = setControlledOpen ?? setInternalOpen;
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictingEvent[]>([]);
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    event?.assignee_id ? [event.assignee_id] : defaultAssigneeId ? [defaultAssigneeId] : []
  );
  // The rest of the event's group — needed on save to know which rows to
  // update in place, which to delete (assignee unchecked), and to exclude
  // from conflict checks (a group's own rows always "overlap" themselves).
  const [groupRows, setGroupRows] = useState<Tables<"calendar_events">[]>(event ? [event] : []);
  // Once the user directly edits the end time, stop auto-shifting it when
  // the start time changes — editing an existing event never auto-shifts
  // (its end time already reflects a considered duration).
  const [endsAtTouched, setEndsAtTouched] = useState(Boolean(event));
  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      event_type: event?.event_type ?? "other",
      client_id: event?.client_id ?? defaultClientId ?? undefined,
      starts_at: event ? toDatetimeLocal(event.starts_at) : defaultCreateStartValue(defaultStartDate),
      ends_at: toDatetimeLocal(event?.ends_at ?? null),
    },
  });

  const startsAt = useWatch({ control, name: "starts_at" });
  const endsAt = useWatch({ control, name: "ends_at" });

  // Reset the form on open — mirrors TaskForm's own handleOpenChange.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;

    reset({
      title: event?.title ?? "",
      event_type: event?.event_type ?? "other",
      client_id: event?.client_id ?? defaultClientId ?? undefined,
      starts_at: event ? toDatetimeLocal(event.starts_at) : defaultCreateStartValue(defaultStartDate),
      ends_at: toDatetimeLocal(event?.ends_at ?? null),
    });
    setEndsAtTouched(Boolean(event));

    if (event) {
      setAssigneeIds([event.assignee_id]);
      setGroupRows([event]);
    } else {
      setAssigneeIds(defaultAssigneeId ? [defaultAssigneeId] : []);
      setGroupRows([]);
    }
  }

  // Once open, fetch the rest of the event's group (its co-assignees) —
  // mirrors TaskForm's own open-triggered refetch of task_assignees.
  useEffect(() => {
    if (!open || !event) return;
    const supabase = createClient();
    supabase
      .from("calendar_events")
      .select("*")
      .eq("event_group_id", event.event_group_id)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setGroupRows(data);
          setAssigneeIds(data.map((row) => row.assignee_id));
        }
      });
  }, [open, event]);

  // A new event's end time follows its start time, 60 minutes later, for
  // every event type — until the user directly edits the end field, after
  // which further start changes stop overriding their chosen duration.
  // Never applies while editing an existing event (endsAtTouched starts
  // true in that case).
  useEffect(() => {
    if (endsAtTouched || !startsAt) return;
    const start = new Date(startsAt);
    if (Number.isNaN(start.getTime())) return;
    setValue("ends_at", toDatetimeLocal(new Date(start.getTime() + ONE_HOUR_MS).toISOString()));
  }, [startsAt, endsAtTouched, setValue]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const incomplete = !open || assigneeIds.length === 0 || !startsAt || !endsAt;
      if (incomplete || new Date(endsAt) <= new Date(startsAt)) {
        if (!cancelled) setConflicts([]);
        return;
      }
      const excludeEventIds = groupRows.map((r) => r.id);
      const results = await Promise.all(
        assigneeIds.map((assigneeId) =>
          findConflicts({
            assigneeId,
            startsAt: new Date(startsAt).toISOString(),
            endsAt: new Date(endsAt).toISOString(),
            excludeEventIds,
          })
        )
      );
      const merged = new Map<string, ConflictingEvent>();
      for (const list of results) for (const c of list) merged.set(c.id, c);
      if (!cancelled) setConflicts(Array.from(merged.values()));
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [open, assigneeIds, startsAt, endsAt, groupRows]);

  async function onSubmit(values: EventFormValues) {
    if (assigneeIds.length === 0) {
      toast.error("Select at least one assignee");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const sharedPayload = {
      title: values.title,
      event_type: values.event_type,
      client_id: values.client_id || null,
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: new Date(values.ends_at).toISOString(),
    };

    if (!event) {
      const eventGroupId = crypto.randomUUID();
      const { data, error } = await supabase
        .from("calendar_events")
        .insert(assigneeIds.map((assignee_id) => ({ ...sharedPayload, event_group_id: eventGroupId, assignee_id })))
        .select();
      setLoading(false);

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success("Event created");
      setOpen(false);
      onSuccess?.(data ?? [], []);
      return;
    }

    const existingAssigneeIds = groupRows.map((r) => r.assignee_id);
    const keptIds = existingAssigneeIds.filter((id) => assigneeIds.includes(id));
    const removedRows = groupRows.filter((r) => !assigneeIds.includes(r.assignee_id));
    const addedIds = assigneeIds.filter((id) => !existingAssigneeIds.includes(id));

    const savedRows: Tables<"calendar_events">[] = [];

    if (keptIds.length > 0) {
      const { data, error } = await supabase
        .from("calendar_events")
        .update(sharedPayload)
        .eq("event_group_id", event.event_group_id)
        .in("assignee_id", keptIds)
        .select();
      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }
      savedRows.push(...(data ?? []));
    }

    if (removedRows.length > 0) {
      const { error } = await supabase
        .from("calendar_events")
        .delete()
        .in("id", removedRows.map((r) => r.id));
      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }
    }

    if (addedIds.length > 0) {
      const { data, error } = await supabase
        .from("calendar_events")
        .insert(
          addedIds.map((assignee_id) => ({
            ...sharedPayload,
            event_group_id: event.event_group_id,
            assignee_id,
          }))
        )
        .select();
      if (error) {
        setLoading(false);
        toast.error(error.message);
        return;
      }
      savedRows.push(...(data ?? []));
    }

    setLoading(false);
    toast.success("Event updated");
    setOpen(false);
    onSuccess?.(savedRows, removedRows.map((r) => r.id));
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Event type</Label>
              <Controller
                name="event_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVENT_TYPES.map((t) => (
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
              <Label>Client</Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
                    disabled={Boolean(defaultClientId)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No client (internal)</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assignees</Label>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2">
              {profiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <Checkbox
                    checked={assigneeIds.includes(p.id)}
                    onCheckedChange={(checked) =>
                      setAssigneeIds((prev) =>
                        checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  {p.full_name}
                </label>
              ))}
            </div>
            {assigneeIds.length === 0 && (
              <p className="text-xs text-destructive">Select at least one assignee</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input
                id="ends_at"
                type="datetime-local"
                {...register("ends_at", { onChange: () => setEndsAtTouched(true) })}
              />
              {errors.ends_at && (
                <p className="text-sm text-destructive">{errors.ends_at.message}</p>
              )}
            </div>
          </div>

          <ConflictWarning conflicts={conflicts} />

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : event ? "Save changes" : "Create event"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
