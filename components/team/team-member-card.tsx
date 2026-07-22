"use client";

import { Phone, MessageSquare, Mail, ListPlus, Pencil } from "lucide-react";
import { useUser } from "@/components/providers/user-provider";
import { roleLabel } from "@/lib/auth/roles";
import { colorForId } from "@/lib/colors";
import { TaskForm } from "@/components/pipeline/task-form";
import { EditMemberDialog } from "@/components/team/edit-member-dialog";
import type { Tables } from "@/lib/types/database.types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TeamMemberCard({
  member,
  clients,
  profiles,
  onUpdate,
  onRemoved,
}: {
  member: Tables<"profiles">;
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role">[];
  onUpdate: (member: Tables<"profiles">) => void;
  onRemoved: (memberId: string) => void;
}) {
  const actor = useUser();
  const canEdit = actor.id === member.id || actor.role === "team_leader";
  const hasPhone = Boolean(member.phone);
  // wa.me needs the full international number as digits only — no "+", spaces, or dashes.
  const whatsappPhone = member.phone?.replace(/\D/g, "");
  const dialablePhone = member.phone?.replace(/[^\d+]/g, "");

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <Avatar size="lg">
            <AvatarFallback
              className="font-medium text-white"
              style={{ backgroundColor: colorForId(member.id) }}
            >
              {initials(member.full_name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{member.full_name}</p>
            <p className="text-sm text-muted-foreground">{roleLabel(member.role)}</p>
            <a
              href={`mailto:${member.email}`}
              className="block truncate text-sm text-primary underline underline-offset-4"
            >
              {member.email}
            </a>
            {hasPhone && (
              <p className="truncate text-sm text-muted-foreground">{member.phone}</p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={!hasPhone} asChild={hasPhone}>
            {hasPhone ? (
              <a href={`https://wa.me/${whatsappPhone}`} target="_blank" rel="noopener noreferrer">
                <Phone /> Call
              </a>
            ) : (
              <span>
                <Phone /> Call
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" disabled={!hasPhone} asChild={hasPhone}>
            {hasPhone ? (
              <a href={`sms:${dialablePhone}`}>
                <MessageSquare /> Message
              </a>
            ) : (
              <span>
                <MessageSquare /> Message
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`mailto:${member.email}`}>
              <Mail /> Mail
            </a>
          </Button>
          <TaskForm
            clients={clients}
            profiles={profiles}
            defaultAssigneeId={member.id}
            trigger={
              <Button variant="outline" size="sm">
                <ListPlus /> Add task
              </Button>
            }
          />
          {canEdit && (
            <EditMemberDialog
              member={member}
              trigger={
                <Button variant="outline" size="sm">
                  <Pencil /> Edit
                </Button>
              }
              onSuccess={onUpdate}
              onRemoved={onRemoved}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
