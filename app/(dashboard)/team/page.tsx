import { createClient } from "@/lib/supabase/server";
import { TeamGrid } from "@/components/team/team-grid";
import type { MeetupProposalWithResponses } from "@/components/team/meetup-list";

export default async function TeamPage() {
  const supabase = await createClient();

  const [{ data: profiles }, { data: clients }, { data: proposals }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("clients").select("id, name").eq("archived", false).order("name"),
    supabase
      .from("meetup_proposals")
      .select(
        "*, proposed_by_profile:profiles!meetup_proposals_proposed_by_fkey(id, full_name), responses:meetup_responses(*, profile:profiles(id, full_name))"
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <TeamGrid
      initialMembers={profiles ?? []}
      clients={clients ?? []}
      initialProposals={(proposals ?? []) as unknown as MeetupProposalWithResponses[]}
    />
  );
}
