import type { Database } from "@/lib/types/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLES: { value: UserRole; label: string }[] = [
  { value: "team_leader", label: "Team Leader" },
  { value: "editor_designer", label: "Editor / Graphic Designer" },
  { value: "videographer_photographer", label: "Videographer / Photographer" },
  { value: "social_media_manager", label: "Social Media Manager" },
];

export function roleLabel(role: UserRole): string {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export function isTeamLeader(role: UserRole | null | undefined): boolean {
  return role === "team_leader";
}
