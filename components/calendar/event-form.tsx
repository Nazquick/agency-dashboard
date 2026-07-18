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

const eventSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    event_type: z.enum(["meeting", "shoot", "deadline", "deliverable", "other"]),
    client_id: z.string().optional(),
    assignee_id: z.string().min(1, "Assignee is required"),
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

export function EventForm({
  event,
  clients,
  profiles,
  defaultClientId,
  defaultAssigneeId,
  trigger,
  onSuccess,
}: {
  event?: Tables<"calendar_events">;
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name">[];
  defaultClientId?: string;
  defaultAssigneeId?: string;
  trigger: React.ReactNode;
  onSuccess?: (event: Tables<"calendar_events">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conflicts, setConflicts] = useState<ConflictingEvent[]>([]);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<EventFormValues>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: event?.title ?? "",
      event_type: event?.event_type ?? "other",
      client_id: event?.client_id ?? defaultClientId ?? undefined,
      assignee_id: event?.assignee_id ?? defaultAssigneeId ?? "",
      starts_at: toDatetimeLocal(event?.starts_at ?? null),
      ends_at: toDatetimeLocal(event?.ends_at ?? null),
    },
  });

  const assigneeId = useWatch({ control, name: "assignee_id" });
  const startsAt = useWatch({ control, name: "starts_at" });
  const endsAt = useWatch({ control, name: "ends_at" });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const incomplete = !open || !assigneeId || !startsAt || !endsAt;
      if (incomplete || new Date(endsAt) <= new Date(startsAt)) {
        if (!cancelled) setConflicts([]);
        return;
      }
      const result = await findConflicts({
        assigneeId,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: new Date(endsAt).toISOString(),
        excludeEventId: event?.id,
      });
      if (!cancelled) setConflicts(result);
    }

    check();

    return () => {
      cancelled = true;
    };
  }, [open, assigneeId, startsAt, endsAt, event?.id]);

  async function onSubmit(values: EventFormValues) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: values.title,
      event_type: values.event_type,
      client_id: values.client_id || null,
      assignee_id: values.assignee_id,
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: new Date(values.ends_at).toISOString(),
    };

    const result = event
      ? await supabase.from("calendar_events").update(payload).eq("id", event.id).select().single()
      : await supabase.from("calendar_events").insert(payload).select().single();

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(event ? "Event updated" : "Event created");
    setOpen(false);
    onSuccess?.(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
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
            <Label>Assignee</Label>
            <Controller
              name="assignee_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.assignee_id && (
              <p className="text-sm text-destructive">{errors.assignee_id.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Starts</Label>
              <Input id="starts_at" type="datetime-local" {...register("starts_at")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ends_at">Ends</Label>
              <Input id="ends_at" type="datetime-local" {...register("ends_at")} />
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
