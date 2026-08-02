export type UserRole = string;

export type RoleOption = { value: string; label: string };

export function roleLabel(role: string, roles: RoleOption[]): string {
  return roles.find((r) => r.value === role)?.label ?? role;
}

export function isTeamLeader(role: UserRole | null | undefined): boolean {
  return role === "team_leader";
}

export const MASTER_KEY_EMAIL = "nasir@thequickstyle.com";

export function isMasterKeyUser(email: string | null | undefined): boolean {
  return email === MASTER_KEY_EMAIL;
}
