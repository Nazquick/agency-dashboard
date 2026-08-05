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
      if (leader) {
        const { count } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .neq("status", "done")
          .eq("archived", false);
        setCount(count ?? 0);
        return;
      }
      const { count } = await supabase
        .from("task_assignees")
        .select("task_id, tasks!inner(status, archived)", { count: "exact", head: true })
        .eq("profile_id", profile.id)
        .eq("tasks.archived", false)
        .neq("tasks.status", "done");
      setCount(count ?? 0);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      await refreshCount();

      channel = supabase
        .channel("tasks-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCount)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_assignees" }, refreshCount)
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
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
      {count}
    </span>
  );
}
