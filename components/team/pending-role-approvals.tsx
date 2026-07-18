"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser, roleLabel } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export type RoleChangeRequestWithRelations = Tables<"role_change_requests"> & {
  target: { id: string; full_name: string } | null;
  requested_by_profile: { id: string; full_name: string } | null;
};

export function PendingRoleApprovals({
  initialRequests,
}: {
  initialRequests: RoleChangeRequestWithRelations[];
}) {
  const actor = useUser();
  const [requests, setRequests] = useState(initialRequests);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!isMasterKeyUser(actor.email) || requests.length === 0) {
    return null;
  }

  async function handleDecision(request: RoleChangeRequestWithRelations, approve: boolean) {
    setBusyId(request.id);
    const supabase = createClient();

    if (approve) {
      const { error: roleError } = await supabase
        .from("profiles")
        .update({ role: request.requested_role })
        .eq("id", request.target_user_id);
      if (roleError) {
        setBusyId(null);
        toast.error(roleError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("role_change_requests")
      .update({
        status: approve ? "approved" : "rejected",
        reviewed_by: actor.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", request.id);

    setBusyId(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    setRequests((prev) => prev.filter((r) => r.id !== request.id));
    toast.success(approve ? "Promotion approved" : "Request rejected");
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold">Pending Team Leader approvals</h2>
          <p className="text-xs text-muted-foreground">Only you can approve these.</p>
        </div>
        {requests.map((request) => (
          <div
            key={request.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
          >
            <span>
              <span className="font-medium">{request.requested_by_profile?.full_name ?? "Someone"}</span>{" "}
              wants to promote{" "}
              <span className="font-medium">{request.target?.full_name ?? "a member"}</span> to{" "}
              {roleLabel(request.requested_role)}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={busyId === request.id}
                onClick={() => handleDecision(request, false)}
              >
                Reject
              </Button>
              <Button
                size="sm"
                disabled={busyId === request.id}
                onClick={() => handleDecision(request, true)}
              >
                Approve
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
