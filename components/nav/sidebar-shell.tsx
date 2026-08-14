"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser, useRoles } from "@/components/providers/user-provider";
import { NavBadge } from "@/components/nav/nav-badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLogo } from "@/components/branding/brand-logo";
import { ChangePasswordDialog } from "@/components/account/change-password-dialog";
import { isMasterKeyUser, roleLabel } from "@/lib/auth/roles";
import { colorForId } from "@/lib/colors";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { BASE_TABS, ADMIN_TAB } from "@/lib/nav/items";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Same nav items, badges, and account actions as TopTabs, rearranged as a
// fixed left rail on desktop — the "sidebar" layout variant. Mobile falls
// back to a slide-down menu (the rail itself has nowhere to live at that
// width), same pattern as TopTabs' mobile drawer.
export function SidebarShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const profile = useUser();
  const roles = useRoles();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [lastPathname, setLastPathname] = useState(pathname);

  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setMobileOpen(false);
  }

  const tabs = isMasterKeyUser(profile.email) ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS;

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  function navLink(tab: (typeof tabs)[number], onNavigate?: () => void) {
    const isActive = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
    return (
      <Link
        key={tab.href}
        href={tab.href}
        onClick={onNavigate}
        className={cn(
          "relative flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
        )}
      >
        {tab.label}
        <NavBadge href={tab.href} />
      </Link>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/40">
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-background p-4 md:flex">
        <div className="mb-6">
          <BrandLogo size="md" animated />
        </div>
        <nav className="flex flex-col gap-1">{tabs.map((tab) => navLink(tab))}</nav>
        <div className="mt-auto space-y-3 pt-4">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex w-full items-center gap-2 rounded-md p-1 outline-none hover:bg-secondary/60 focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-xs text-white"
                  style={{ backgroundColor: colorForId(profile.id) }}
                >
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start leading-tight">
                <span className="text-xs font-medium">{profile.full_name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {roleLabel(profile.role, roles)}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="font-medium">{profile.full_name}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {roleLabel(profile.role, roles)}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setChangePasswordOpen(true)}>
                Change password
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleSignOut}>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center justify-between border-b bg-background px-4 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="size-9"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <BrandLogo size="md" />
          <span className="size-9" />
        </header>

        {mobileOpen && (
          <div className="border-b bg-background px-4 pb-4 md:hidden">
            <nav className="flex flex-col gap-1 pt-2">
              {tabs.map((tab) => navLink(tab, () => setMobileOpen(false)))}
            </nav>
            <div className="mt-3 border-t pt-3">
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback
                    className="text-xs text-white"
                    style={{ backgroundColor: colorForId(profile.id) }}
                  >
                    {initials(profile.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-medium">{profile.full_name}</span>
                  <span className="text-xs text-muted-foreground">
                    {roleLabel(profile.role, roles)}
                  </span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <ThemeToggle />
                <Button variant="outline" size="sm" onClick={() => setChangePasswordOpen(true)}>
                  Change password
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign out
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
