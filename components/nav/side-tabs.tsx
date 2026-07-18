"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { segment: "overview", label: "Overview" },
  { segment: "calendar", label: "Calendar" },
  { segment: "pipeline", label: "Pipeline" },
  { segment: "upcoming", label: "Upcoming" },
  { segment: "files", label: "Files" },
];

export function SideTabs({ clientId }: { clientId: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex w-48 shrink-0 flex-col gap-1">
      {TABS.map((tab) => {
        const href = `/clients/${clientId}/${tab.segment}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
