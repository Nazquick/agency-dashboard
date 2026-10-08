import { createClient } from "@/lib/supabase/server";
import { TeamGrid } from "@/components/team/team-grid";
import type { MeetupProposalWithResponses } from "@/components/team/meetup-list";
import { flattenTasksByAssignee, type RawTaskRow } from "@/lib/tasks/assignees";
import type { RoleChangeRequestWithRelations } from "@/components/team/pending-role-approvals";

export default async function TeamPage() {
  const supabase = await createClient();

  const [
    { data: profiles },
    { data: deactivatedProfiles },
    { data: clients },
    { data: proposals },
    { data: tasks },
    { data: roleRequests },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("*")
      .neq("role", "client")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("*")
      .neq("role", "client")
      .eq("active", false)
      .order("full_name"),
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
    supabase
      .from("meetup_proposals")
      .select(
        "*, proposed_by_profile:profiles!meetup_proposals_proposed_by_fkey(id, full_name), responses:meetup_responses(*, profile:profiles(id, full_name))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("tasks")
      .select(
        "id, title, priority, deadline, client:clients!tasks_client_id_fkey(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name, role), task_assignees(profile:profiles(id, full_name, role))"
      )
      .eq("archived", false)
      .neq("status", "done"),
    supabase
      .from("role_change_requests")
      .select(
        "*, target:profiles!role_change_requests_target_user_id_fkey(id, full_name), requested_by_profile:profiles!role_change_requests_requested_by_fkey(id, full_name)"
      )
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    // RLS limits this to the admin's view of everyone (everyone else only
    // sees their own rows), so last-login is only shown to the admin.
    supabase
      .from("user_sessions")
      .select("user_id, last_seen_at")
      .order("last_seen_at", { ascending: false })
      .limit(300),
  ]);

  const lastSeenByMember: Record<string, string> = {};
  for (const s of sessions ?? []) {
    if (!(s.user_id in lastSeenByMember)) lastSeenByMember[s.user_id] = s.last_seen_at;
  }

  return (
    <TeamGrid
      initialMembers={profiles ?? []}
      initialDeactivatedMembers={deactivatedProfiles ?? []}
      clients={clients ?? []}
      initialProposals={(proposals ?? []) as unknown as MeetupProposalWithResponses[]}
      tasks={flattenTasksByAssignee((tasks ?? []) as unknown as RawTaskRow[])}
      initialRoleRequests={(roleRequests ?? []) as unknown as RoleChangeRequestWithRelations[]}
      lastSeenByMember={lastSeenByMember}
    />
  );
}
