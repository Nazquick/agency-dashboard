"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { computeQuotaStatus } from "@/lib/analytics/quota";
import { startOfCurrentMonthIso, startOfTrailingQuarterIso } from "@/lib/analytics/metrics";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const OVERAGE_CHARGE = 3000;

type QuotaTask = Pick<
  Tables<"tasks">,
  "id" | "title" | "client_id" | "created_at" | "status" | "overage_charged"
>;
type QuotaClient = Pick<
  Tables<"clients">,
  "id" | "name" | "monthly_task_limit" | "quarterly_task_limit"
>;

function overageTaskIds(tasks: QuotaTask[], limit: number | null, sinceIso: string): Set<string> {
  if (limit == null) return new Set();
  const inWindow = tasks
    .filter((t) => t.created_at >= sinceIso)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  return new Set(inWindow.slice(limit).map((t) => t.id));
}

export function ClientQuotaPanel({
  clients,
  initialTasks,
}: {
  clients: QuotaClient[];
  initialTasks: QuotaTask[];
}) {
  const actor = useUser();
  const [tasks, setTasks] = useState(initialTasks);
  const [chargingId, setChargingId] = useState<string | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("tasks")
        .select("id, title, client_id, created_at, status, overage_charged");
      if (data) setTasks(data);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("client-quota-panel")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const overClients = useMemo(() => {
    const statuses = computeQuotaStatus(clients, tasks);
    return statuses.filter((s) => s.overMonthly || s.overQuarterly);
  }, [clients, tasks]);

  const monthStart = startOfCurrentMonthIso();
  const quarterStart = startOfTrailingQuarterIso();

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
        No clients are over their monthly or quarterly credit right now.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {overClients.map(({ client, monthlyUsed, monthlyLimit, overMonthly, quarterlyUsed, quarterlyLimit, overQuarterly }) => {
        const clientTasks = tasks.filter((t) => t.client_id === client.id);
        const monthlyOverageIds = overMonthly
          ? overageTaskIds(clientTasks, monthlyLimit, monthStart)
          : new Set<string>();
        const quarterlyOverageIds = overQuarterly
          ? overageTaskIds(clientTasks, quarterlyLimit, quarterStart)
          : new Set<string>();
        const overageIds = new Set([...monthlyOverageIds, ...quarterlyOverageIds]);
        const overageTasks = clientTasks
          .filter((t) => overageIds.has(t.id))
          .sort((a, b) => a.created_at.localeCompare(b.created_at));

        return (
          <div key={client.id} className="space-y-3 rounded-lg border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-medium">{client.name}</span>
              <div className="flex gap-2">
                {overMonthly && (
                  <Badge variant="destructive">
                    {monthlyUsed}/{monthlyLimit} this month
                  </Badge>
                )}
                {overQuarterly && (
                  <Badge variant="destructive">
                    {quarterlyUsed}/{quarterlyLimit} this quarter
                  </Badge>
                )}
              </div>
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
