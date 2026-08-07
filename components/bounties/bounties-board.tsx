"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { PRIORITY_BADGE_CLASS, priorityLabel } from "@/lib/tasks/constants";
import { colorForId } from "@/lib/colors";
import type { Tables } from "@/lib/types/database.types";
import { CreateSpecialTaskDialog } from "@/components/bounties/create-special-task-dialog";
import { ApproveBountyDialog } from "@/components/bounties/approve-bounty-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type AssigneeSummary = Pick<Tables<"profiles">, "id" | "full_name">;

export type BountyTask = Tables<"tasks"> & {
  client: { id: string; name: string } | null;
  assignee: AssigneeSummary | null;
};

function formatMoney(amount: number | null) {
  if (amount === null) return "—";
  return `${amount.toLocaleString()} kr`;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function TaskMeta({ task }: { task: BountyTask }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <Badge variant="secondary" className={PRIORITY_BADGE_CLASS[task.priority]}>
        {priorityLabel(task.priority)}
      </Badge>
      {task.client && <span>{task.client.name}</span>}
      {task.deadline && <span>Due {formatDate(task.deadline)}</span>}
    </div>
  );
}

export function BountiesBoard({
  initialTasks,
  clients,
}: {
  initialTasks: BountyTask[];
  clients: Pick<Tables<"clients">, "id" | "name">[];
}) {
  const profile = useUser();
  const isMaster = isMasterKeyUser(profile.email);
  const [tasks, setTasks] = useState(initialTasks);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [deliveringId, setDeliveringId] = useState<string | null>(null);
  const [approvingTask, setApprovingTask] = useState<BountyTask | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("tasks")
        .select(
          "*, client:clients(id, name), assignee:profiles!tasks_assignee_id_fkey(id, full_name)"
        )
        .eq("is_special", true)
        .eq("archived", false)
        .order("created_at", { ascending: false });
      if (data) setTasks(data as BountyTask[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      await refetch();
      channel = supabase
        .channel("bounties-board")
        .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, refetch)
        .subscribe();
    }

    setup();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  function handleCreated(task: Tables<"tasks">) {
    setTasks((prev) => [{ ...task, client: null, assignee: null } as BountyTask, ...prev]);
  }

  async function handleClaim(task: BountyTask) {
    setClaimingId(task.id);
    const supabase = createClient();
    const { error } = await supabase.rpc("claim_special_task", { p_task_id: task.id });
    setClaimingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    logActivity(supabase, {
      actorId: profile.id,
      action: "special_task_claimed",
      summary: `Claimed bounty "${task.title}"`,
      entityType: "task",
      entityId: task.id,
    });
    toast.success("Bounty claimed");
  }

  async function handleDeliver(task: BountyTask) {
    setDeliveringId(task.id);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "review" }).eq("id", task.id);
    setDeliveringId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    logActivity(supabase, {
      actorId: profile.id,
      action: "special_task_delivered",
      summary: `Marked bounty "${task.title}" as delivered`,
      entityType: "task",
      entityId: task.id,
    });
    toast.success("Marked as delivered");
  }

  async function handleRequestChanges(task: BountyTask) {
    const supabase = createClient();
    const { error } = await supabase.from("tasks").update({ status: "in_progress" }).eq("id", task.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Sent back for changes");
  }

  async function handleMarkPaid(task: BountyTask) {
    if (!task.assignee) return;
    setPayingId(task.id);
    const supabase = createClient();

    const { error: txError } = await supabase.from("company_transactions").insert({
      type: "expense",
      category: "Bounty payout",
      amount: task.payout_amount ?? 0,
      description: `${task.title} — ${task.assignee.full_name}`,
      created_by: profile.id,
    });
    if (txError) {
      setPayingId(null);
      toast.error(txError.message);
      return;
    }

    const { error } = await supabase
      .from("tasks")
      .update({ payout_paid: true, payout_paid_at: new Date().toISOString() })
      .eq("id", task.id);
    setPayingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as paid");
  }

  const open = tasks.filter((t) => t.status === "not_started" && !t.assignee_id);
  const claimed = tasks.filter(
    (t) => t.assignee_id && t.status !== "review" && t.status !== "done"
  );
  const awaitingApproval = tasks.filter((t) => t.status === "review");
  const completed = tasks.filter((t) => t.status === "done");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bounties</h1>
          <p className="text-sm text-muted-foreground">Special tasks with a payout attached.</p>
        </div>
        {isMaster && <CreateSpecialTaskDialog clients={clients} onSuccess={handleCreated} />}
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Open ({open.length})</h2>
        {open.length === 0 && <p className="text-sm text-muted-foreground">No open bounties right now.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {open.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span>{task.title}</span>
                  <Badge className="shrink-0 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    {formatMoney(task.payout_amount)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {task.description && (
                  <p className="line-clamp-3 text-sm text-muted-foreground">{task.description}</p>
                )}
                <TaskMeta task={task} />
                <Button
                  size="sm"
                  className="w-full"
                  disabled={claimingId === task.id}
                  onClick={() => handleClaim(task)}
                >
                  {claimingId === task.id ? "Claiming…" : "Claim"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">In progress ({claimed.length})</h2>
        {claimed.length === 0 && <p className="text-sm text-muted-foreground">Nothing claimed yet.</p>}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {claimed.map((task) => {
            const isMine = task.assignee_id === profile.id;
            return (
              <Card key={task.id}>
                <CardHeader>
                  <CardTitle className="flex items-start justify-between gap-2 text-base">
                    <span>{task.title}</span>
                    <Badge className="shrink-0 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                      {formatMoney(task.payout_amount)}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <TaskMeta task={task} />
                  {task.assignee && (
                    <div className="flex items-center gap-2 text-sm">
                      <span
                        className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
                        style={{ backgroundColor: colorForId(task.assignee.id) }}
                      >
                        {task.assignee.full_name.slice(0, 1).toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">{task.assignee.full_name}</span>
                    </div>
                  )}
                  {isMine && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      disabled={deliveringId === task.id}
                      onClick={() => handleDeliver(task)}
                    >
                      {deliveringId === task.id ? "Submitting…" : "Mark as delivered"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Awaiting approval ({awaitingApproval.length})
        </h2>
        {awaitingApproval.length === 0 && (
          <p className="text-sm text-muted-foreground">Nothing waiting on review.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {awaitingApproval.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span>{task.title}</span>
                  <Badge className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400">
                    {formatMoney(task.payout_amount)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TaskMeta task={task} />
                {task.assignee && (
                  <p className="text-sm text-muted-foreground">Delivered by {task.assignee.full_name}</p>
                )}
                {isMaster && (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => setApprovingTask(task)}>
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRequestChanges(task)}
                    >
                      Request changes
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Completed ({completed.length})</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {completed.map((task) => (
            <Card key={task.id}>
              <CardHeader>
                <CardTitle className="flex items-start justify-between gap-2 text-base">
                  <span>{task.title}</span>
                  <Badge className="shrink-0 bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400">
                    {formatMoney(task.payout_amount)}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <TaskMeta task={task} />
                {task.assignee && (
                  <p className="text-sm text-muted-foreground">Paid to {task.assignee.full_name}</p>
                )}
                {task.payout_paid ? (
                  <Badge variant="secondary">
                    {task.payout_method === "instant" ? "Paid instantly" : "Paid via invoice"}
                  </Badge>
                ) : (
                  <div className="space-y-2">
                    <Badge variant="secondary">Pending — added to monthly invoice</Badge>
                    {isMaster && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        disabled={payingId === task.id}
                        onClick={() => handleMarkPaid(task)}
                      >
                        {payingId === task.id ? "Marking…" : "Mark as paid"}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {approvingTask && (
        <ApproveBountyDialog
          task={approvingTask}
          open={!!approvingTask}
          onOpenChange={(open) => !open && setApprovingTask(null)}
        />
      )}
    </div>
  );
}
