import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/types/database.types";

export type ConflictingEvent = Tables<"calendar_events"> & {
  client: { id: string; name: string } | null;
};

export async function findConflicts({
  assigneeId,
  startsAt,
  endsAt,
  excludeEventId,
}: {
  assigneeId: string;
  startsAt: string;
  endsAt: string;
  excludeEventId?: string;
}): Promise<ConflictingEvent[]> {
  const supabase = createClient();

  let query = supabase
    .from("calendar_events")
    .select("*, client:clients(id, name)")
    .eq("assignee_id", assigneeId)
    .lt("starts_at", endsAt)
    .gt("ends_at", startsAt);

  if (excludeEventId) {
    query = query.neq("id", excludeEventId);
  }

  const { data } = await query;
  return (data ?? []) as unknown as ConflictingEvent[];
}
