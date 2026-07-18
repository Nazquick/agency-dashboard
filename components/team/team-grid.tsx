"use client";

import { useState } from "react";
import { AddMemberDialog } from "@/components/team/add-member-dialog";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { SuggestMeetupDialog } from "@/components/team/suggest-meetup-dialog";
import { MeetupList, type MeetupProposalWithResponses } from "@/components/team/meetup-list";
import type { Tables } from "@/lib/types/database.types";

export function TeamGrid({
  initialMembers,
  clients,
  initialProposals,
}: {
  initialMembers: Tables<"profiles">[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
  initialProposals: MeetupProposalWithResponses[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const profiles = members.map((m) => ({ id: m.id, full_name: m.full_name, role: m.role }));

  function handleUpdate(updated: Tables<"profiles">) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleAdded(added: Tables<"profiles">) {
    setMembers((prev) => [...prev, added].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Everyone with access to the dashboard.
          </p>
        </div>
        <div className="flex gap-2">
          <SuggestMeetupDialog profiles={profiles} />
          <AddMemberDialog onSuccess={handleAdded} />
        </div>
      </div>

      <MeetupList initialProposals={initialProposals} />

      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-white p-12 text-center">
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              clients={clients}
              profiles={profiles}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
