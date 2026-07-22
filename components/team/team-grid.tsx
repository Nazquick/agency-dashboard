"use client";

import { useState } from "react";
import { AddMemberDialog } from "@/components/team/add-member-dialog";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { SuggestMeetupDialog } from "@/components/team/suggest-meetup-dialog";
import { MeetupList, type MeetupProposalWithResponses } from "@/components/team/meetup-list";
import { WorkloadKanban, type WorkloadTask } from "@/components/team/workload-kanban";
import { WorkloadBalance } from "@/components/team/workload-balance";
import {
  PendingRoleApprovals,
  type RoleChangeRequestWithRelations,
} from "@/components/team/pending-role-approvals";
import type { Tables } from "@/lib/types/database.types";

export function TeamGrid({
  initialMembers,
  clients,
  initialProposals,
  tasks,
  initialSalaries,
  initialRoleRequests,
}: {
  initialMembers: Tables<"profiles">[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
  initialProposals: MeetupProposalWithResponses[];
  tasks: WorkloadTask[];
  initialSalaries: Tables<"profile_salaries">[];
  initialRoleRequests: RoleChangeRequestWithRelations[];
}) {
  const [members, setMembers] = useState(initialMembers);
  const profiles = members.map((m) => ({ id: m.id, full_name: m.full_name, role: m.role }));

  function handleUpdate(updated: Tables<"profiles">) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleAdded(added: Tables<"profiles">) {
    setMembers((prev) => [...prev, added].sort((a, b) => a.full_name.localeCompare(b.full_name)));
  }

  function handleRemoved(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Everyone with access to the dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SuggestMeetupDialog profiles={profiles} />
          <AddMemberDialog onSuccess={handleAdded} />
        </div>
      </div>

      <PendingRoleApprovals initialRequests={initialRoleRequests} />

      <MeetupList initialProposals={initialProposals} />

      <WorkloadKanban tasks={tasks} />

      <WorkloadBalance tasks={tasks} members={members} initialSalaries={initialSalaries} />

      {members.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
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
              onRemoved={handleRemoved}
            />
          ))}
        </div>
      )}
    </div>
  );
}
