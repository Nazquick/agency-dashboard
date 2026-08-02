"use client";

import { useState } from "react";
import { toast } from "sonner";
import { creditsUsedInMonth } from "@/lib/analytics/metrics";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function CreditStatusPanel({
  clientId,
  clientName,
  monthlyCreditLimit,
  monthlyFee,
  tasks,
  initialTopup,
}: {
  clientId: string;
  clientName?: string;
  monthlyCreditLimit: number | null;
  monthlyFee: number | null;
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at" | "task_type" | "archived">[];
  initialTopup: Pick<Tables<"credit_topups">, "credits_added"> | null;
}) {
  const [topup, setTopup] = useState(initialTopup);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const baseLimit = monthlyCreditLimit ?? 8;
  const limit = baseLimit + (topup?.credits_added ?? 0);
  const used = creditsUsedInMonth(tasks, clientId);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const over = used > limit;

  async function handleApprove() {
    setLoading(true);
    const res = await fetch("/api/portal/credit-topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to top up credits");
      return;
    }

    setTopup(body.topup);
    setOpen(false);
    toast.success("Credits topped up");
  }

  return (
    <Card>
      <CardContent className="space-y-3 pt-6">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">{clientName ? `${clientName} — credits` : "Credits this month"}</span>
          <Badge variant={over ? "destructive" : "secondary"}>
            {used} / {limit}
          </Badge>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${over ? "bg-red-500" : "bg-primary"}`}
            style={{ width: `${Math.max(4, pct)}%` }}
          />
        </div>

        {topup ? (
          <Badge variant="secondary">Topped up to {limit} credits this month</Badge>
        ) : monthlyFee == null ? (
          <p className="text-xs text-muted-foreground">
            Contact your account manager to enable credit top-ups.
          </p>
        ) : (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                Top up credits
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Top up {clientName ? `${clientName}'s` : "your"} credits
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm">
                  Double your credits to <strong>{baseLimit * 2}</strong> for the rest of this
                  month?
                </p>
                <p className="text-sm text-muted-foreground">
                  <strong>{(monthlyFee * 0.5).toLocaleString()} kr</strong> will be added to your
                  invoice this month.
                </p>
                <div className="flex items-center gap-3">
                  <Button onClick={handleApprove} disabled={loading}>
                    {loading ? "Approving…" : "Approve"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    By approving, you agree to a higher invoice from DYOR Studio this month.
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
