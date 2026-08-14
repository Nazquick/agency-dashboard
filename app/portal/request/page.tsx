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

  const [{ data: clients }, { data: group }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    profile.client_group_id
      ? supabase
          .from("client_groups")
          .select("id, all_client_id")
          .eq("id", profile.client_group_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return (
    <RequestTaskForm
      clients={clients ?? []}
      groupId={group?.id ?? null}
      allClientId={group?.all_client_id ?? null}
    />
  );
}
