"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { GroupOption } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";
const ADD_NEW = "__add_new__";

export function GroupSelect({
  groups,
  value,
  onChange,
  onGroupCreated,
  allowCreate,
}: {
  groups: GroupOption[];
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  onGroupCreated: (group: GroupOption) => void;
  allowCreate: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
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

    toast.success(`Group "${body.group.name}" added`);
    onGroupCreated(body.group);
    onChange(body.group.id);
    setAdding(false);
    setNewName("");
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="New group name (e.g. JØNK)"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" size="sm" disabled={creating || !newName.trim()} onClick={handleCreate}>
          {creating ? "Adding…" : "Add"}
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setAdding(false)}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (v === ADD_NEW) {
          setAdding(true);
          return;
        }
        onChange(v === NONE ? undefined : v);
      }}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="No group" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>No group (single location)</SelectItem>
        {groups.map((g) => (
          <SelectItem key={g.id} value={g.id}>
            {g.name}
          </SelectItem>
        ))}
        {allowCreate && <SelectItem value={ADD_NEW}>+ Add new group</SelectItem>}
      </SelectContent>
    </Select>
  );
}
