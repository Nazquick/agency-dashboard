"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";

export function BountiesBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refreshCount() {
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("is_special", true)
        .eq("archived", false)
        .is("assignee_id", null);
      setCount(count ?? 0);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      await refreshCount();
      channel = supabase
        .channel("bounties-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCount)
        .subscribe();
    }

    setup();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  if (!count) return null;

  return (
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-xs font-medium text-white">
      {count}
    </span>
  );
}
