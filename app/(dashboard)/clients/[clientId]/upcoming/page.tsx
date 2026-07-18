import { createClient } from "@/lib/supabase/server";
import { eventTypeLabel, type EventType } from "@/lib/calendar/constants";
import { priorityLabel, type TaskPriority } from "@/lib/tasks/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

type UpcomingItem = {
  id: string;
  kind: "event" | "deadline";
  title: string;
  when: string;
  subtitle: string;
};

function formatWhen(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function ClientUpcomingPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: events }, { data: tasks }] = await Promise.all([
    supabase
      .from("calendar_events")
      .select("id, title, event_type, starts_at, assignee:profiles!calendar_events_assignee_id_fkey(full_name)")
      .eq("client_id", clientId)
      .gte("starts_at", now)
      .order("starts_at")
      .limit(20),
    supabase
      .from("tasks")
      .select("id, title, priority, deadline, assignee:profiles!tasks_assignee_id_fkey(full_name)")
      .eq("client_id", clientId)
      .neq("status", "done")
      .eq("archived", false)
      .not("deadline", "is", null)
      .gte("deadline", now)
      .order("deadline")
      .limit(20),
  ]);

  const items: UpcomingItem[] = [
    ...(events ?? []).map((e) => ({
      id: `event-${e.id}`,
      kind: "event" as const,
      title: e.title,
      when: e.starts_at,
      subtitle: `${eventTypeLabel(e.event_type as EventType)}${
        e.assignee ? ` · ${(e.assignee as unknown as { full_name: string }).full_name}` : ""
      }`,
    })),
    ...(tasks ?? []).map((t) => ({
      id: `task-${t.id}`,
      kind: "deadline" as const,
      title: t.title,
      when: t.deadline as string,
      subtitle: `${priorityLabel(t.priority as TaskPriority)} priority${
        t.assignee ? ` · ${(t.assignee as unknown as { full_name: string }).full_name}` : ""
      }`,
    })),
  ].sort((a, b) => a.when.localeCompare(b.when));

  return (
    <Card>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="p-6 text-sm text-muted-foreground">
            Nothing coming up — no scheduled events or task deadlines.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-6 py-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{item.title}</span>
                    <Badge variant={item.kind === "deadline" ? "destructive" : "secondary"}>
                      {item.kind === "deadline" ? "Deadline" : "Event"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.subtitle}</p>
                </div>
                <span className="shrink-0 text-sm text-muted-foreground">
                  {formatWhen(item.when)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
