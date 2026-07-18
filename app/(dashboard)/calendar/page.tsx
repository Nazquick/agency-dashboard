import { createClient } from "@/lib/supabase/server";
import { CalendarView, type CalendarEventWithRelations } from "@/components/calendar/calendar-view";

export default async function GlobalCalendarPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "*, client:clients(id, name), assignee:profiles!calendar_events_assignee_id_fkey(id, full_name, role), task:tasks(id, priority)"
      )
      .order("starts_at"),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Every booking across the team — toggle people to spot conflicts.
        </p>
      </div>

      <CalendarView
        initialEvents={(events ?? []) as unknown as CalendarEventWithRelations[]}
        clients={clients ?? []}
        profiles={profiles ?? []}
        showAssigneeFilter
      />
    </div>
  );
}
