"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";

export function PipelineBadge() {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refreshCount() {
      let query = supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .neq("status", "done")
        .eq("archived", false);
      if (!leader) {
        query = query.eq("assignee_id", profile.id);
      }
      const { count } = await query;
      setCount(count ?? 0);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      await refreshCount();

      channel = supabase
        .channel("tasks-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCount)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [leader, profile.id]);

  if (!count) return null;

  return (
    <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-medium text-white">
      {count}
    </span>
  );
}
