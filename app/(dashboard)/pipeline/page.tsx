import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { flattenAssignees } from "@/lib/tasks/assignees";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "*, client:clients!tasks_client_id_fkey(id, name), credit_client:clients!tasks_credit_client_id_fkey(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role), task_assignees(profile:profiles(id, full_name, role))"
      )
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_external")
      .neq("role", "client")
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Action Pipeline</h1>
        <p className="text-sm text-muted-foreground">
          Every task across every client, assignable to the team.
        </p>
      </div>

      <PipelineBoard
        initialTasks={flattenAssignees((tasks ?? []) as unknown as Parameters<typeof flattenAssignees>[0])}
        clients={clients ?? []}
        profiles={profiles ?? []}
      />
    </div>
  );
}
