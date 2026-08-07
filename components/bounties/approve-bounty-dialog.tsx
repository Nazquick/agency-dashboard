"use client";

import { useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import type { BountyTask } from "@/components/bounties/bounties-board";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

export function ApproveBountyDialog({
  task,
  open,
  onOpenChange,
}: {
  task: BountyTask;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const profile = useUser();
  const [loading, setLoading] = useState<"instant" | "monthly_invoice" | null>(null);

  async function approve(method: "instant" | "monthly_invoice") {
    setLoading(method);
    const supabase = createClient();
    const now = new Date().toISOString();

    if (method === "instant") {
      const { error: txError } = await supabase.from("company_transactions").insert({
        type: "expense",
        category: "Bounty payout",
        amount: task.payout_amount ?? 0,
        description: `${task.title} — ${task.assignee?.full_name ?? "Unassigned"}`,
        created_by: profile.id,
      });
      if (txError) {
        setLoading(null);
        toast.error(txError.message);
        return;
      }
    }

    const { error } = await supabase
      .from("tasks")
      .update({
        status: "done",
        payout_method: method,
        payout_approved_by: profile.id,
        payout_approved_at: now,
        payout_paid: method === "instant",
        payout_paid_at: method === "instant" ? now : null,
      })
      .eq("id", task.id);

    setLoading(null);

    if (error) {
      toast.error(error.message);
      return;
    }

    logActivity(supabase, {
      actorId: profile.id,
      action: "special_task_approved",
      summary: `Approved bounty "${task.title}" — ${method === "instant" ? "paid instantly" : "added to monthly total"}`,
      entityType: "task",
      entityId: task.id,
    });

    toast.success(method === "instant" ? "Approved and paid" : "Approved — added to monthly total");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Approve &quot;{task.title}&quot;</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Payout: {(task.payout_amount ?? 0).toLocaleString()} kr to{" "}
          {task.assignee?.full_name ?? "the assignee"}. Choose how it gets paid.
        </p>
        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button
            className="w-full"
            disabled={loading !== null}
            onClick={() => approve("instant")}
          >
            {loading === "instant" ? "Paying…" : "Approve & pay now"}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={loading !== null}
            onClick={() => approve("monthly_invoice")}
          >
            {loading === "monthly_invoice" ? "Approving…" : "Approve & add to monthly total"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
