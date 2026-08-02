import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { RequestTaskForm } from "@/components/portal/request-task-form";

export default async function PortalRequestPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, client_group_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id && !profile?.client_group_id) redirect("/");

  const { data: clients } = await supabase.from("clients").select("id, name").order("name");

  return <RequestTaskForm clients={clients ?? []} />;
}
