"use client";

import { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer, type View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { enUS } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { EventForm } from "@/components/calendar/event-form";
import { eventTypeLabel, type EventType } from "@/lib/calendar/constants";
import type { Tables } from "@/lib/types/database.types";
import { colorForId } from "@/lib/colors";
import { taskColor, TASK_COLOR_HEX, TASK_COLOR_LABEL } from "@/lib/tasks/color-code";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export type CalendarEventWithRelations = Tables<"calendar_events"> & {
  client: { id: string; name: string } | null;
  assignee: { id: string; full_name: string; role: Tables<"profiles">["role"] } | null;
  task: { id: string; priority: Tables<"tasks">["priority"] } | null;
};

function colorForAssignee(id: string | null) {
  return id ? colorForId(id) : "#6b7280";
}

function CalendarEventContent({ event }: { event: { title: string; resource: CalendarEventWithRelations } }) {
  const e = event.resource;
  const color = taskColor(e.task?.priority ?? "medium", e.assignee?.role);
  return (
    <div className="flex items-center gap-1.5 truncate">
      {color && (
        <span
          className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: TASK_COLOR_HEX[color] }}
          title={TASK_COLOR_LABEL[color]}
          aria-hidden
        />
      )}
      <span className="truncate">{event.title}</span>
    </div>
  );
}

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleDateString(undefined, dateFmt)}, ${start.toLocaleTimeString(undefined, timeFmt)}–${end.toLocaleTimeString(undefined, timeFmt)}`;
}

export function CalendarView({
  initialEvents,
  clients,
  profiles,
  defaultClientId,
  showAssigneeFilter = false,
}: {
  initialEvents: CalendarEventWithRelations[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role">[];
  defaultClientId?: string;
  showAssigneeFilter?: boolean;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const [events, setEvents] = useState(initialEvents);
  const [visibleAssignees, setVisibleAssignees] = useState<Set<string>>(
    new Set(profiles.map((p) => p.id))
  );
  const [view, setView] = useState<View>("month");
  const [date, setDate] = useState(new Date());

  const filteredEvents = useMemo(
    () => events.filter((e) => !showAssigneeFilter || visibleAssignees.has(e.assignee_id)),
    [events, visibleAssignees, showAssigneeFilter]
  );

  const calendarEvents = useMemo(
    () =>
      filteredEvents.map((e) => ({
        id: e.id,
        title: e.client ? `${e.title} — ${e.client.name}` : e.title,
        start: new Date(e.starts_at),
        end: new Date(e.ends_at),
        resource: e,
      })),
    [filteredEvents]
  );

  function toggleAssignee(id: string) {
    setVisibleAssignees((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function canEdit(event: CalendarEventWithRelations) {
    return leader || event.assignee_id === profile.id;
  }

  function upsertLocal(saved: Tables<"calendar_events">) {
    setEvents((prev) => {
      const existing = prev.find((e) => e.id === saved.id);
      const withRelations: CalendarEventWithRelations = {
        ...saved,
        client: clients.find((c) => c.id === saved.client_id) ?? null,
        assignee: profiles.find((p) => p.id === saved.assignee_id)
          ? {
              id: saved.assignee_id,
              full_name: profiles.find((p) => p.id === saved.assignee_id)!.full_name,
              role: profiles.find((p) => p.id === saved.assignee_id)!.role,
            }
          : null,
        task: existing?.task ?? null,
      };
      const exists = prev.some((e) => e.id === saved.id);
      return exists
        ? prev.map((e) => (e.id === saved.id ? withRelations : e))
        : [withRelations, ...prev];
    });
  }

  async function handleDelete(event: CalendarEventWithRelations) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("calendar_events").delete().eq("id", event.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEvents((prev) => prev.filter((e) => e.id !== event.id));
    toast.success("Event deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showAssigneeFilter ? (
          <div className="flex flex-wrap gap-2">
            {profiles.map((p) => {
              const active = visibleAssignees.has(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleAssignee(p.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    active
                      ? "border-transparent text-white"
                      : "border-gray-300 text-muted-foreground"
                  )}
                  style={active ? { backgroundColor: colorForAssignee(p.id) } : undefined}
                >
                  {p.full_name}
                </button>
              );
            })}
          </div>
        ) : (
          <div />
        )}

        <EventForm
          clients={clients}
          profiles={profiles}
          defaultClientId={defaultClientId}
          trigger={<Button>New Event</Button>}
          onSuccess={upsertLocal}
        />
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <Calendar
          localizer={localizer}
          events={calendarEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          views={["month", "week", "day"]}
          components={{ event: CalendarEventContent }}
          eventPropGetter={(event) => {
            const e = event.resource as CalendarEventWithRelations;
            return {
              style: {
                backgroundColor: colorForAssignee(e.assignee_id),
                border: e.source === "email" ? "2px solid #000000" : undefined,
              },
            };
          }}
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              {!defaultClientId && <TableHead>Client</TableHead>}
              <TableHead>Assignee</TableHead>
              <TableHead>When</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEvents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No events yet.
                </TableCell>
              </TableRow>
            ) : (
              filteredEvents
                .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
                .map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {eventTypeLabel(event.event_type as EventType)}
                      </Badge>
                    </TableCell>
                    {!defaultClientId && (
                      <TableCell className="text-muted-foreground">
                        {event.client?.name ?? "—"}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground">
                      {event.assignee?.full_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatRange(event.starts_at, event.ends_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {canEdit(event) && (
                        <div className="flex justify-end gap-2">
                          <EventForm
                            event={event}
                            clients={clients}
                            profiles={profiles}
                            defaultClientId={defaultClientId}
                            trigger={
                              <Button variant="outline" size="sm">
                                Edit
                              </Button>
                            }
                            onSuccess={upsertLocal}
                          />
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(event)}>
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
