export const BASE_TABS = [
  { href: "/today", label: "My Day" },
  { href: "/clients", label: "Clients" },
  { href: "/pipeline", label: "Action Pipeline" },
  { href: "/bounties", label: "Bounties" },
  { href: "/calendar", label: "Calendar" },
  { href: "/post-plan", label: "Post Plan" },
  { href: "/questions", label: "Questions" },
  { href: "/team", label: "Team" },
  { href: "/analytics", label: "Analytics" },
  { href: "/assistant", label: "Assistant" },
] as const;

export const ADMIN_TAB = { href: "/admin", label: "Admin" } as const;
export const CAMPAIGNS_TAB = { href: "/campaigns", label: "Campaigns" } as const;

export type NavLinkItem = { href: string; label: string };
export type NavEntry =
  | { type: "link"; item: NavLinkItem }
  | { type: "group"; label: string; items: NavLinkItem[] };

// Twelve flat tabs don't fit a laptop-width header, so the top bar groups
// them: Work, Clients, then the standalone Team / Assistant / Admin.
export function buildNav(isMaster: boolean): NavEntry[] {
  return [
    {
      type: "group",
      label: "Work",
      items: [
        { href: "/today", label: "My Day" },
        { href: "/pipeline", label: "Action Pipeline" },
        { href: "/calendar", label: "Calendar" },
        { href: "/post-plan", label: "Post Plan" },
        { href: "/bounties", label: "Bounties" },
      ],
    },
    {
      type: "group",
      label: "Clients",
      items: [
        { href: "/clients", label: "Clients" },
        { href: "/questions", label: "Questions" },
        ...(isMaster ? [CAMPAIGNS_TAB] : []),
        { href: "/analytics", label: "Analytics" },
      ],
    },
    { type: "link", item: { href: "/team", label: "Team" } },
    { type: "link", item: { href: "/assistant", label: "Assistant" } },
    ...(isMaster ? [{ type: "link" as const, item: ADMIN_TAB }] : []),
  ];
}
