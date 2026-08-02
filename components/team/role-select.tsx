"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { RoleOption } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ADD_NEW = "__add_new__";

export function RoleSelect({
  roles,
  value,
  onChange,
  onRoleCreated,
  allowCreate,
}: {
  roles: RoleOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  onRoleCreated: (role: RoleOption) => void;
  allowCreate: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [creating, setCreating] = useState(false);

  const assignableRoles = roles.filter((r) => r.value !== "client");

  async function handleCreate() {
    if (!newLabel.trim()) return;
    setCreating(true);
    const res = await fetch("/api/team/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: newLabel.trim() }),
    });
    const body = await res.json();
    setCreating(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to create role");
      return;
    }

    toast.success(`Role "${body.role.label}" added`);
    onRoleCreated(body.role);
    onChange(body.role.value);
    setAdding(false);
    setNewLabel("");
  }

  if (adding) {
    return (
      <div className="flex gap-2">
        <Input
          autoFocus
          placeholder="New role name"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleCreate();
            }
          }}
        />
        <Button type="button" size="sm" disabled={creating || !newLabel.trim()} onClick={handleCreate}>
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
      value={value}
      onValueChange={(v) => (v === ADD_NEW ? setAdding(true) : onChange(v))}
    >
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select role" />
      </SelectTrigger>
      <SelectContent>
        {assignableRoles.map((r) => (
          <SelectItem key={r.value} value={r.value}>
            {r.label}
          </SelectItem>
        ))}
        {allowCreate && <SelectItem value={ADD_NEW}>+ Add new role</SelectItem>}
      </SelectContent>
    </Select>
  );
}
