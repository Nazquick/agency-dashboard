"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
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
import { buildNav, type NavLinkItem } from "@/lib/nav/items";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isItemActive(pathname: string, item: NavLinkItem) {
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

// Badges are absolutely positioned for flat tabs; inside a group trigger or
// menu row they sit inline instead.
const INLINE_BADGES = "ml-1.5 inline-flex gap-0.5 [&>span]:static [&>span]:ml-0";

export function TopTabs() {
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

  const nav = buildNav(isMasterKeyUser(profile.email));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/");
  }

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-16 max-w-[1920px] items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3 md:gap-8">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 lg:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </Button>
          <div className="flex flex-col leading-none">
            <BrandLogo size="md" animated />
            <span className="mt-1 text-[8px] font-medium uppercase tracking-normal text-muted-foreground">
              Agency Dashboard
            </span>
          </div>
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((entry) => {
              if (entry.type === "link") {
                const isActive = isItemActive(pathname, entry.item);
                return (
                  <Link
                    key={entry.item.href}
                    href={entry.item.href}
                    className={cn(
                      "relative whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    {entry.item.label}
                    <NavBadge href={entry.item.href} />
                  </Link>
                );
              }
              const isActive = entry.items.some((item) => isItemActive(pathname, item));
              return (
                <DropdownMenu key={entry.label}>
                  <DropdownMenuTrigger
                    className={cn(
                      "flex items-center whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    {entry.label}
                    <span className={INLINE_BADGES}>
                      {entry.items.map((item) => (
                        <NavBadge key={item.href} href={item.href} />
                      ))}
                    </span>
                    <ChevronDown className="ml-1 size-3.5 opacity-60" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="min-w-44">
                    {entry.items.map((item) => (
                      <DropdownMenuItem key={item.href} asChild>
                        <Link
                          href={item.href}
                          className={cn("flex items-center", isItemActive(pathname, item) && "bg-secondary")}
                        >
                          {item.label}
                          <span className={INLINE_BADGES}>
                            <NavBadge href={item.href} />
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Avatar className="h-8 w-8">
                <AvatarFallback
                  className="text-xs text-white"
                  style={{ backgroundColor: colorForId(profile.id) }}
                >
                  {initials(profile.full_name)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
      </div>

      {mobileOpen && (
        <div className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t bg-background px-4 pb-4 lg:hidden">
          <nav className="flex flex-col gap-1 pt-2">
            {nav.map((entry) => {
              const items = entry.type === "link" ? [entry.item] : entry.items;
              return (
                <div key={entry.type === "link" ? entry.item.href : entry.label} className="flex flex-col gap-1">
                  {entry.type === "group" && (
                    <p className="px-3 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {entry.label}
                    </p>
                  )}
                  {items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "relative flex items-center whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                        isItemActive(pathname, item)
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                      )}
                    >
                      {item.label}
                      <NavBadge href={item.href} />
                    </Link>
                  ))}
                </div>
              );
            })}
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
                <span className="text-xs text-muted-foreground">{roleLabel(profile.role, roles)}</span>
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

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </header>
  );
}
