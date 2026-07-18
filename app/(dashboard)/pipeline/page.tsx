import { createClient } from "@/lib/supabase/server";
import { PipelineBoard, type TaskWithRelations } from "@/components/pipeline/pipeline-board";

export default async function PipelinePage() {
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
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
        initialTasks={(tasks ?? []) as unknown as TaskWithRelations[]}
        clients={clients ?? []}
        profiles={profiles ?? []}
      />
    </div>
  );
}
