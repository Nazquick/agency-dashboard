import { TopTabs } from "@/components/nav/top-tabs";
import { SidebarShell } from "@/components/nav/sidebar-shell";
import { LAYOUT_VARIANT } from "@/lib/branding/config";

// Reads the tenant's chosen layout_variant (env-driven, unset on DYOR's
// own deployment) and picks the matching shell. "sidebar" needs a
// structurally different component; "compact"/"minimal" reuse TopTabs and
// only differ via CSS scoped to the data-* attributes below (see
// app/globals.css). Default/unset renders byte-identical markup to before
// this component existed.
export function DashboardShell({ children }: { children: React.ReactNode }) {
  if (LAYOUT_VARIANT === "sidebar") {
    return <SidebarShell>{children}</SidebarShell>;
  }

  return (
    <div
      className="min-h-screen bg-muted/40"
      data-density={LAYOUT_VARIANT === "compact" ? "compact" : undefined}
      data-theme-variant={LAYOUT_VARIANT === "minimal" ? "minimal" : undefined}
    >
      <TopTabs />
      <main className="mx-auto max-w-7xl p-4 sm:p-6">{children}</main>
    </div>
  );
}
