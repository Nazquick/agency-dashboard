"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { useUser, useRoles } from "@/components/providers/user-provider";
import { isMasterKeyUser, roleLabel } from "@/lib/auth/roles";
import { TeamMemberCard } from "@/components/team/team-member-card";
import { EditMemberDialog } from "@/components/team/edit-member-dialog";
import { SuggestMeetupDialog } from "@/components/team/suggest-meetup-dialog";
import { MeetupList, type MeetupProposalWithResponses } from "@/components/team/meetup-list";
import { WorkloadKanban, type WorkloadTask } from "@/components/team/workload-kanban";
import { WorkloadBalance } from "@/components/team/workload-balance";
import {
  PendingRoleApprovals,
  type RoleChangeRequestWithRelations,
} from "@/components/team/pending-role-approvals";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";

export function TeamGrid({
  initialMembers,
  initialDeactivatedMembers,
  clients,
  initialProposals,
  tasks,
  initialRoleRequests,
}: {
  initialMembers: Tables<"profiles">[];
  initialDeactivatedMembers: Tables<"profiles">[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
  initialProposals: MeetupProposalWithResponses[];
  tasks: WorkloadTask[];
  initialRoleRequests: RoleChangeRequestWithRelations[];
}) {
  const actor = useUser();
  const roles = useRoles();
  const [members, setMembers] = useState(initialMembers);
  const [deactivatedMembers, setDeactivatedMembers] = useState(initialDeactivatedMembers);
  const internalMembers = members.filter((m) => !m.is_external);
  const externalMembers = members.filter((m) => m.is_external);
  const profiles = members.map((m) => ({
    id: m.id,
    full_name: m.full_name,
    role: m.role,
    is_external: m.is_external,
  }));

  function handleUpdate(updated: Tables<"profiles">) {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
  }

  function handleRemoved(memberId: string) {
    const removed = members.find((m) => m.id === memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    if (removed) setDeactivatedMembers((prev) => [...prev, { ...removed, active: false }]);
  }

  function handleReactivated(updated: Tables<"profiles">) {
    setDeactivatedMembers((prev) => prev.filter((m) => m.id !== updated.id));
    setMembers((prev) =>
      [...prev, { ...updated, active: true }].sort((a, b) => a.full_name.localeCompare(b.full_name))
    );
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
        </div>
      </div>

      <PendingRoleApprovals initialRequests={initialRoleRequests} />

      <MeetupList initialProposals={initialProposals} />

      <WorkloadKanban tasks={tasks} />

      <WorkloadBalance tasks={tasks} />

      {internalMembers.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">No team members yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {internalMembers.map((member) => (
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

      {externalMembers.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">External team</h2>
            <p className="text-xs text-muted-foreground">
              No dashboard access — assignable to tasks and visible in reports.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {externalMembers.map((member) => (
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
        </div>
      )}

      {isMasterKeyUser(actor.email) && deactivatedMembers.length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold">Deactivated members</h2>
            <p className="text-xs text-muted-foreground">
              Can&apos;t sign in and won&apos;t appear in assignee pickers — their past work stays
              on record.
            </p>
          </div>
          <div className="space-y-2">
            {deactivatedMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-dashed bg-muted/30 p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{member.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {roleLabel(member.role, roles)}
                    {member.is_external ? " · External" : ""} · {member.email}
                  </p>
                </div>
                <EditMemberDialog
                  member={member}
                  trigger={
                    <Button variant="outline" size="sm">
                      <Pencil /> Manage
                    </Button>
                  }
                  onSuccess={handleReactivated}
                  onRemoved={handleRemoved}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
