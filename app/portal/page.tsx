import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { currentPeriodStart } from "@/lib/analytics/metrics";
import { ClientPipelineTable } from "@/components/portal/client-pipeline-table";
import { CreditStatusPanel } from "@/components/portal/credit-status-panel";
import type { Tables } from "@/lib/types/database.types";

type PortalTask = Tables<"tasks"> & { client: { id: string; name: string } | null };

export default async function PortalPipelinePage() {
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

  // No explicit client_id filter below — accessible_client_ids()-backed RLS
  // already scopes every query to exactly what this account can see,
  // whether that's one location (regular account) or several (master
  // account), so one code path serves both.
  const [{ data: tasks }, { data: clients }, { data: topups }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, client:clients(id, name)")
      .order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name, monthly_credit_limit, monthly_fee").order("name"),
    supabase.from("credit_topups").select("client_id, credits_added").eq("period_start", currentPeriodStart()),
  ]);

  const accessibleClients = clients ?? [];
  const allTasks = (tasks ?? []) as unknown as PortalTask[];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {accessibleClients.map((client) => (
          <CreditStatusPanel
            key={client.id}
            clientId={client.id}
            clientName={accessibleClients.length > 1 ? client.name : undefined}
            monthlyCreditLimit={client.monthly_credit_limit}
            monthlyFee={client.monthly_fee}
            tasks={allTasks.filter((t) => t.client_id === client.id)}
            initialTopup={(topups ?? []).find((t) => t.client_id === client.id) ?? null}
          />
        ))}
      </div>
      <ClientPipelineTable initialTasks={allTasks} clients={accessibleClients} />
    </div>
  );
}
