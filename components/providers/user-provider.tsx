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
