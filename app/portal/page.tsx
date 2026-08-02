import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentPeriodStart } from "@/lib/analytics/metrics";
import { ClientPipelineTable } from "@/components/portal/client-pipeline-table";
import { CreditStatusPanel } from "@/components/portal/credit-status-panel";

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

  const [{ data: tasks }, { data: client }, { data: topup }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("client_id", profile.client_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("clients")
      .select("monthly_credit_limit, monthly_fee")
      .eq("id", profile.client_id)
      .single(),
    supabase
      .from("credit_topups")
      .select("credits_added")
      .eq("client_id", profile.client_id)
      .eq("period_start", currentPeriodStart())
      .maybeSingle(),
  ]);

  return (
    <div className="space-y-6">
      <CreditStatusPanel
        clientId={profile.client_id}
        monthlyCreditLimit={client?.monthly_credit_limit ?? null}
        monthlyFee={client?.monthly_fee ?? null}
        tasks={tasks ?? []}
        initialTopup={topup ?? null}
      />
      <ClientPipelineTable initialTasks={tasks ?? []} clientId={profile.client_id} />
    </div>
  );
}
