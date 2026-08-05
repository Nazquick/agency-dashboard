import { createClient } from "@/lib/supabase/server";
import { PipelineBoard } from "@/components/pipeline/pipeline-board";
import { flattenAssignees } from "@/lib/tasks/assignees";

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
      .select(
        "*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role), task_assignees(profile:profiles(id, full_name, role))"
      )
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase
      .from("profiles")
      .select("id, full_name, role, is_external")
      .neq("role", "client")
      .eq("active", true)
      .order("full_name"),
  ]);

  return (
    <PipelineBoard
      initialTasks={flattenAssignees((tasks ?? []) as unknown as Parameters<typeof flattenAssignees>[0])}
      clients={clients ?? []}
      profiles={profiles ?? []}
      defaultClientId={clientId}
      showClientColumn={false}
    />
  );
}
