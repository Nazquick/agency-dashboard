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
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id) redirect("/");

  return <RequestTaskForm clientId={profile.client_id} />;
}
