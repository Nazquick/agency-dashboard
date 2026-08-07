import { createClient } from "@/lib/supabase/server";
import { BountiesBoard } from "@/components/bounties/bounties-board";

export default async function BountiesPage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name)")
      .eq("is_special", true)
      .eq("archived", false)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
  ]);

  return (
    <BountiesBoard
      initialTasks={(tasks ?? []) as unknown as Parameters<typeof BountiesBoard>[0]["initialTasks"]}
      clients={clients ?? []}
    />
  );
}
