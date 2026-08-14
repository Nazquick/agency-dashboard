"use client";

import { createContext, useContext, useState } from "react";
import type { Tables } from "@/lib/types/database.types";
import type { RoleOption } from "@/lib/auth/roles";

type Profile = Tables<"profiles">;

const UserContext = createContext<Profile | null>(null);

export function UserProvider({
  profile,
  children,
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={profile}>{children}</UserContext.Provider>;
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return ctx;
}

const RolesContext = createContext<{
  roles: RoleOption[];
  addRole: (role: RoleOption) => void;
} | null>(null);

export function RolesProvider({
  roles: initialRoles,
  children,
}: {
  roles: RoleOption[];
  children: React.ReactNode;
}) {
  const [roles, setRoles] = useState(initialRoles);

  function addRole(role: RoleOption) {
    setRoles((prev) => (prev.some((r) => r.value === role.value) ? prev : [...prev, role]));
  }

  return <RolesContext.Provider value={{ roles, addRole }}>{children}</RolesContext.Provider>;
}

export function useRoles() {
  const ctx = useContext(RolesContext);
  if (!ctx) {
    throw new Error("useRoles must be used within a RolesProvider");
  }
  return ctx.roles;
}

export function useAddRole() {
  const ctx = useContext(RolesContext);
  if (!ctx) {
    throw new Error("useAddRole must be used within a RolesProvider");
  }
  return ctx.addRole;
}

export type GroupOption = { id: string; name: string; all_client_id: string | null };

const GroupsContext = createContext<{
  groups: GroupOption[];
  addGroup: (group: GroupOption) => void;
} | null>(null);

export function GroupsProvider({
  groups: initialGroups,
  children,
}: {
  groups: GroupOption[];
  children: React.ReactNode;
}) {
  const [groups, setGroups] = useState(initialGroups);

  function addGroup(group: GroupOption) {
    setGroups((prev) => (prev.some((g) => g.id === group.id) ? prev : [...prev, group]));
  }

  return <GroupsContext.Provider value={{ groups, addGroup }}>{children}</GroupsContext.Provider>;
}

export function useGroups() {
  const ctx = useContext(GroupsContext);
  if (!ctx) {
    throw new Error("useGroups must be used within a GroupsProvider");
  }
  return ctx.groups;
}

export function useAddGroup() {
  const ctx = useContext(GroupsContext);
  if (!ctx) {
    throw new Error("useAddGroup must be used within a GroupsProvider");
  }
  return ctx.addGroup;
}
