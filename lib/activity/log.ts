import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

export async function logActivity(
  supabase: SupabaseClient<Database>,
  params: {
    actorId: string;
    action: string;
    summary: string;
    entityType?: string;
    entityId?: string;
  }
) {
  const { error } = await supabase.from("activity_log").insert({
    actor_id: params.actorId,
    action: params.action,
    summary: params.summary,
    entity_type: params.entityType ?? null,
    entity_id: params.entityId ?? null,
  });
  // Never block the real mutation on the activity log failing.
  if (error) console.error("activity log failed", error);
}
