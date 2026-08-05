import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientQuestionsPanel } from "@/components/portal/client-questions-panel";

export default async function PortalQuestionsPage() {
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

  const [{ data: clients }, { data: questions }] = await Promise.all([
    supabase.from("clients").select("id, name").order("name"),
    supabase.from("client_questions").select("*").order("created_at", { ascending: false }),
  ]);

  return <ClientQuestionsPanel clients={clients ?? []} initialQuestions={questions ?? []} />;
}
