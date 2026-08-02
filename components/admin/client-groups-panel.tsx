"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useGroups, useAddGroup } from "@/components/providers/user-provider";
import { CreateMasterLoginDialog } from "@/components/clients/create-master-login-dialog";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ClientGroupsPanel({
  clients,
}: {
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
}) {
  const groups = useGroups();
  const addGroup = useAddGroup();
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreateGroup() {
    if (!newName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/client-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    });
    const body = await res.json();
    setCreating(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to create group");
      return;
    }

    addGroup(body.group);
    setNewName("");
    toast.success(`Group "${body.group.name}" created`);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Group a brand&apos;s locations together, then create one &quot;client master account&quot; login
        that can see all of their tasks, dates, and analytics at once. Assign a client to a group
        from its Edit form.
      </p>
      <div className="flex gap-2">
        <Input
          placeholder="New group name (e.g. JØNK)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreateGroup();
            }
          }}
        />
        <Button disabled={creating || !newName.trim()} onClick={handleCreateGroup}>
          {creating ? "Creating…" : "Create group"}
        </Button>
      </div>

      {groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No groups yet.</p>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => {
            const members = clients.filter((c) => c.group_id === g.id);
            return (
              <div key={g.id} className="space-y-2 rounded-lg border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {members.length} location{members.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <CreateMasterLoginDialog groupId={g.id} groupName={g.name} />
                </div>
                {members.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {members.map((m) => m.name).join(", ")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
