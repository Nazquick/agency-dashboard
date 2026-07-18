import { createClient } from "@/lib/supabase/server";
import { TeamGrid } from "@/components/team/team-grid";
import type { MeetupProposalWithResponses } from "@/components/team/meetup-list";
import type { WorkloadTask } from "@/components/team/workload-kanban";
import type { RoleChangeRequestWithRelations } from "@/components/team/pending-role-approvals";

export default async function TeamPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: clients },
    { data: proposals },
    { data: tasks },
    { data: salaries },
    { data: roleRequests },
  ] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase
      .from("meetup_proposals")
      .select(
        "*, proposed_by_profile:profiles!meetup_proposals_proposed_by_fkey(id, full_name), responses:meetup_responses(*, profile:profiles(id, full_name))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select(
        "id, title, priority, deadline, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role)"
      )
      .eq("archived", false)
      .neq("status", "done"),
    supabase.from("profile_salaries").select("*"),
    supabase
      .from("role_change_requests")
      .select(
        "*, target:profiles!role_change_requests_target_user_id_fkey(id, full_name), requested_by_profile:profiles!role_change_requests_requested_by_fkey(id, full_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
  ]);

  return (
    <TeamGrid
      initialMembers={profiles ?? []}
      clients={clients ?? []}
      initialProposals={(proposals ?? []) as unknown as MeetupProposalWithResponses[]}
      tasks={(tasks ?? []) as unknown as WorkloadTask[]}
      initialSalaries={salaries ?? []}
      initialRoleRequests={(roleRequests ?? []) as unknown as RoleChangeRequestWithRelations[]}
    />
  );
}
