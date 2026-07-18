"use client";

import { createContext, useContext } from "react";
import type { Tables } from "@/lib/types/database.types";

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
