import { createClient } from "@/lib/supabase/server";
import { CalendarView, type CalendarEventWithRelations } from "@/components/calendar/calendar-view";

export default async function ClientCalendarPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: events }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select(
        "*, client:clients(id, name), assignee:profiles!calendar_events_assignee_id_fkey(id, full_name, role), task:tasks(id, priority)"
      )
      .eq("client_id", clientId)
      .order("starts_at"),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <CalendarView
      initialEvents={(events ?? []) as unknown as CalendarEventWithRelations[]}
      clients={clients ?? []}
      profiles={profiles ?? []}
      defaultClientId={clientId}
    />
  );
}
