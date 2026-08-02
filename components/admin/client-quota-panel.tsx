"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { computeCreditStatus } from "@/lib/analytics/quota";
import { startOfCurrentMonthIso } from "@/lib/analytics/metrics";
import { creditsFor } from "@/lib/tasks/constants";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const OVERAGE_CHARGE = 3000;

type QuotaTask = Pick<
  Tables<"tasks">,
  "id" | "title" | "client_id" | "created_at" | "status" | "overage_charged" | "task_type" | "archived"
>;
type QuotaClient = Pick<Tables<"clients">, "id" | "name" | "monthly_credit_limit">;
type QuotaTopup = Pick<Tables<"credit_topups">, "client_id" | "period_start" | "credits_added">;

// Walk a client's tasks for the month chronologically, accumulating
// credits — every task from the one that first pushes the running total
// past the limit onward is billable overage.
function overageTaskIds(tasks: QuotaTask[], limit: number | null, sinceIso: string): Set<string> {
  if (limit == null) return new Set();
  const inWindow = tasks
    .filter((t) => t.created_at >= sinceIso && !t.archived)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const overage = new Set<string>();
  let running = 0;
  for (const t of inWindow) {
    running += creditsFor(t.task_type);
    if (running > limit) overage.add(t.id);
  }
  return overage;
}

export function ClientQuotaPanel({
  clients,
  initialTasks,
  initialTopups,
}: {
  clients: QuotaClient[];
  initialTasks: QuotaTask[];
  initialTopups: QuotaTopup[];
}) {
  const actor = useUser();
  const [tasks, setTasks] = useState(initialTasks);
  const [topups, setTopups] = useState(initialTopups);
  const [chargingId, setChargingId] = useState<string | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const [{ data: taskRows }, { data: topupRows }] = await Promise.all([
        supabase
          .from("tasks")
          .select("id, title, client_id, created_at, status, overage_charged, task_type, archived"),
        supabase.from("credit_topups").select("client_id, period_start, credits_added"),
      ]);
      if (taskRows) setTasks(taskRows);
      if (topupRows) setTopups(topupRows);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("client-quota-panel")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "credit_topups" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const overClients = useMemo(() => {
    const statuses = computeCreditStatus(clients, tasks, topups);
    return statuses.filter((s) => s.over);
  }, [clients, tasks, topups]);

  const monthStart = startOfCurrentMonthIso();

  async function chargeOverage(task: QuotaTask, clientName: string) {
    setChargingId(task.id);
    const supabase = createClient();
    const { error: txError } = await supabase.from("company_transactions").insert({
      type: "income",
      category: "Overage charge",
      amount: OVERAGE_CHARGE,
      description: `${clientName} — ${task.title}`,
      created_by: actor.id,
    });
    if (txError) {
      setChargingId(null);
      toast.error(txError.message);
      return;
    }
    const { error: taskError } = await supabase
      .from("tasks")
      .update({ overage_charged: true })
      .eq("id", task.id);
    setChargingId(null);
    if (taskError) {
      toast.error(taskError.message);
      return;
    }
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, overage_charged: true } : t)));
    toast.success(`Logged ${OVERAGE_CHARGE.toLocaleString()} kr for ${clientName}`);
  }

  if (overClients.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No clients are over their monthly credit right now.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {overClients.map(({ client, used, limit }) => {
        const clientTasks = tasks.filter((t) => t.client_id === client.id);
        const overageIds = overageTaskIds(clientTasks, limit, monthStart);
        const overageTasks = clientTasks
          .filter((t) => overageIds.has(t.id))
          .sort((a, b) => a.created_at.localeCompare(b.created_at));

        return (
          <div key={client.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{client.name}</span>
              <Badge variant="destructive">
                {used}/{limit} credits this month
              </Badge>
            </div>

            <div className="space-y-2">
              {overageTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2.5 text-sm"
                >
                  <span className="font-medium">{task.title}</span>
                  {task.overage_charged ? (
                    <Badge variant="secondary">Charged</Badge>
                  ) : task.status === "done" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={chargingId === task.id}
                      onClick={() => chargeOverage(task, client.name)}
                    >
                      {chargingId === task.id ? "Logging…" : `Request payment (${OVERAGE_CHARGE.toLocaleString()} kr)`}
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Not yet billable — not done</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
