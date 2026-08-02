import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { AdminGrid } from "@/components/admin/admin-grid";
import type { WorkloadTask } from "@/components/team/workload-kanban";

export default async function AdminPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  if (!isMasterKeyUser(profile?.email)) {
    redirect("/clients");
  }

  const [
    { data: clients },
    { data: quotaClients },
    { data: quotaTasks },
    { data: quotaTopups },
    { data: loginProfiles },
    { data: members },
    { data: salaries },
    { data: tasks },
    { data: companyTransactions },
    { data: sessions },
    { data: activity },
  ] = await Promise.all([
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
    supabase
      .from("clients")
      .select("id, name, monthly_credit_limit")
      .eq("archived", false)
      .order("name"),
    supabase
      .from("tasks")
      .select("id, title, client_id, created_at, status, overage_charged, task_type, archived"),
    supabase.from("credit_topups").select("client_id, period_start, credits_added"),
    supabase.from("profiles").select("id, full_name, client_id").eq("role", "client"),
    supabase.from("profiles").select("*").neq("role", "client").order("full_name"),
    supabase.from("profile_salaries").select("*"),
    supabase
      .from("tasks")
      .select(
        "id, title, priority, deadline, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role)"
      )
      .eq("archived", false)
      .neq("status", "done"),
    supabase.from("company_transactions").select("*").order("transaction_date", { ascending: false }),
    supabase.from("user_sessions").select("*"),
    supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
  ]);

  const salaryTotal = (salaries ?? []).reduce((sum, s) => sum + Number(s.monthly_salary), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-muted-foreground">Visible only to you.</p>
      </div>

      <AdminGrid
        clients={clients ?? []}
        quotaClients={quotaClients ?? []}
        quotaTasks={quotaTasks ?? []}
        quotaTopups={quotaTopups ?? []}
        loginProfiles={loginProfiles ?? []}
        members={members ?? []}
        salaries={salaries ?? []}
        tasks={(tasks ?? []) as unknown as WorkloadTask[]}
        companyTransactions={companyTransactions ?? []}
        salaryTotal={salaryTotal}
        initialSessions={sessions ?? []}
        initialActivity={activity ?? []}
      />
    </div>
  );
}
