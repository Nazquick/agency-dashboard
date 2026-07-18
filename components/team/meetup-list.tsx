"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export type MeetupResponseWithProfile = Tables<"meetup_responses"> & {
  profile: { id: string; full_name: string } | null;
};

export type MeetupProposalWithResponses = Tables<"meetup_proposals"> & {
  proposed_by_profile: { id: string; full_name: string } | null;
  responses: MeetupResponseWithProfile[];
};

const RESPONSE_BADGE_CLASS: Record<Tables<"meetup_responses">["response"], string> = {
  pending: "bg-gray-100 text-gray-600",
  accepted: "bg-green-100 text-green-700",
  declined: "bg-red-100 text-red-700",
};

const STATUS_BADGE_CLASS: Record<Tables<"meetup_proposals">["status"], string> = {
  proposed: "bg-blue-100 text-blue-700",
  confirmed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-600",
};

function formatRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  return `${start.toLocaleDateString(undefined, dateFmt)}, ${start.toLocaleTimeString(undefined, timeFmt)}–${end.toLocaleTimeString(undefined, timeFmt)}`;
}

export function MeetupList({
  initialProposals,
}: {
  initialProposals: MeetupProposalWithResponses[];
}) {
  const profile = useUser();
  const [proposals, setProposals] = useState(initialProposals);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("meetup_proposals")
        .select(
          "*, proposed_by_profile:profiles!meetup_proposals_proposed_by_fkey(id, full_name), responses:meetup_responses(*, profile:profiles(id, full_name))"
        )
        .order("created_at", { ascending: false });
      if (data) setProposals(data as unknown as MeetupProposalWithResponses[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      channel = supabase
        .channel("meetups")
        .on("postgres_changes", { event: "*", schema: "public", table: "meetup_proposals" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "meetup_responses" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function respond(proposalId: string, response: "accepted" | "declined") {
    setRespondingId(proposalId);
    const supabase = createClient();

    const { error } = await supabase
      .from("meetup_responses")
      .update({ response, responded_at: new Date().toISOString() })
      .eq("proposal_id", proposalId)
      .eq("profile_id", profile.id);

    if (error) {
      setRespondingId(null);
      toast.error(error.message);
      return;
    }

    if (response === "accepted") {
      await supabase.rpc("confirm_meetup_if_all_accepted", { p_proposal_id: proposalId });
    }

    setProposals((prev) =>
      prev.map((p) =>
        p.id === proposalId
          ? {
              ...p,
              responses: p.responses.map((r) =>
                r.profile_id === profile.id
                  ? { ...r, response, responded_at: new Date().toISOString() }
                  : r
              ),
            }
          : p
      )
    );
    setRespondingId(null);
    toast.success(response === "accepted" ? "You're in" : "Declined");
  }

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">Meetups</h2>
      <div className="space-y-3">
        {proposals.map((proposal) => {
          const myResponse = proposal.responses.find((r) => r.profile_id === profile.id);
          return (
            <Card key={proposal.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{proposal.purpose}</h3>
                    <Badge className={STATUS_BADGE_CLASS[proposal.status]}>
                      {proposal.status === "proposed"
                        ? "Awaiting RSVPs"
                        : proposal.status === "confirmed"
                          ? "Confirmed"
                          : "Cancelled"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatRange(proposal.starts_at, proposal.ends_at)}
                    {proposal.proposed_by_profile && ` · Proposed by ${proposal.proposed_by_profile.full_name}`}
                  </p>
                  {proposal.goal && (
                    <p className="mt-1 text-sm text-muted-foreground">{proposal.goal}</p>
                  )}
                </div>
                {myResponse?.response === "pending" && proposal.status === "proposed" && (
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="sm"
                      disabled={respondingId === proposal.id}
                      onClick={() => respond(proposal.id, "accepted")}
                    >
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={respondingId === proposal.id}
                      onClick={() => respond(proposal.id, "declined")}
                    >
                      Decline
                    </Button>
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {proposal.responses.map((r) => (
                  <Badge key={r.id} className={RESPONSE_BADGE_CLASS[r.response]}>
                    {r.profile?.full_name ?? "—"}: {r.response}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
