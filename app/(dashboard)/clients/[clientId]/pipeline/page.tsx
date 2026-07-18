import { createClient } from "@/lib/supabase/server";
import { PipelineBoard, type TaskWithRelations } from "@/components/pipeline/pipeline-board";

export default async function ClientPipelinePage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const [{ data: tasks }, { data: clients }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase.from("profiles").select("id, full_name, role").order("full_name"),
  ]);

  return (
    <PipelineBoard
      initialTasks={(tasks ?? []) as unknown as TaskWithRelations[]}
      clients={clients ?? []}
      profiles={profiles ?? []}
      defaultClientId={clientId}
      showClientColumn={false}
    />
  );
}
