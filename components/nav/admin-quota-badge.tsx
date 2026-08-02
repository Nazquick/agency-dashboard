"use client";

import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { computeCreditStatus } from "@/lib/analytics/quota";

export function AdminQuotaBadge() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refreshCount() {
      const [{ data: clients }, { data: tasks }, { data: topups }] = await Promise.all([
        supabase.from("clients").select("id, name, monthly_credit_limit").eq("archived", false),
        supabase.from("tasks").select("client_id, created_at, task_type, archived"),
        supabase.from("credit_topups").select("client_id, period_start, credits_added"),
      ]);
      const statuses = computeCreditStatus(clients ?? [], tasks ?? [], topups ?? []);
      setCount(statuses.filter((s) => s.over).length);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;

      await refreshCount();

      channel = supabase
        .channel("admin-quota-badge")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refreshCount)
        .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, refreshCount)
        .on("postgres_changes", { event: "*", schema: "public", table: "credit_topups" }, refreshCount)
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
    <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-medium text-white">
      {count}
    </span>
  );
}
