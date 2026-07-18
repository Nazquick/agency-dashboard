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
    <nav className="flex gap-1 overflow-x-auto pb-1 md:w-48 md:shrink-0 md:flex-col md:overflow-visible md:pb-0">
      {TABS.map((tab) => {
        const href = `/clients/${clientId}/${tab.segment}`;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.segment}
            href={href}
            className={cn(
              "shrink-0 rounded-md px-3 py-2 text-sm font-medium transition-colors",
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
