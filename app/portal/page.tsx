import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientPipelineTable } from "@/components/portal/client-pipeline-table";

export default async function PortalPipelinePage() {
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

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("client_id", profile.client_id)
    .order("created_at", { ascending: false });

  return <ClientPipelineTable initialTasks={tasks ?? []} clientId={profile.client_id} />;
}
