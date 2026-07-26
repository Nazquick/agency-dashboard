import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CalendarView, type CalendarEventWithRelations } from "@/components/calendar/calendar-view";

export default async function PortalCalendarPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id) redirect("/");

  const { data: events } = await supabase
    .from("calendar_events")
    .select(
      "*, client:clients(id, name), assignee:profiles!calendar_events_assignee_id_fkey(id, full_name, role), task:tasks(id, priority)"
    )
    .eq("client_id", profile.client_id)
    .order("starts_at");

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">Everything scheduled for your business.</p>
      </div>

      <CalendarView
        initialEvents={(events ?? []) as unknown as CalendarEventWithRelations[]}
        clients={[]}
        profiles={[]}
        defaultClientId={profile.client_id}
        readOnly
      />
    </div>
  );
}
