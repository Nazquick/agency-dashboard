export type UserRole = string;

export type RoleOption = { value: string; label: string };

export function roleLabel(role: string, roles: RoleOption[]): string {
  return roles.find((r) => r.value === role)?.label ?? role;
}

export function isTeamLeader(role: UserRole | null | undefined): boolean {
  return role === "team_leader";
}

// Permanent — baked into this codebase itself, not tenant-configurable.
// Every white-label fork of this app carries this constant unchanged, so
// DYOR retains support access to every dashboard it hands out.
export const DYOR_SUPPORT_EMAIL = "nasir@thequickstyle.com";

// A white-label tenant's own admin email, set once at their Vercel deploy
// time via NEXT_PUBLIC_TENANT_ADMIN_EMAIL. Unset on DYOR's own production
// deployment, so isMasterKeyUser() there still matches only DYOR_SUPPORT_EMAIL.
function tenantAdminEmails(): string[] {
  const raw = process.env.NEXT_PUBLIC_TENANT_ADMIN_EMAIL;
  return raw ? [raw] : [];
}

export function isMasterKeyUser(email: string | null | undefined): boolean {
  if (!email) return false;
  return email === DYOR_SUPPORT_EMAIL || tenantAdminEmails().includes(email);
}
