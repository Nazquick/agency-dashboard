"use client";

import { cn } from "@/lib/utils";
import { colorForId } from "@/lib/colors";
import { activityHealth, engagementScore, tasksThisMonth } from "@/lib/analytics/metrics";
import { salesThisMonth, formatSales } from "@/lib/analytics/sales";
import { HealthBar } from "@/components/analytics/health-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Tables } from "@/lib/types/database.types";

export function ClientCompareGrid({
  clients,
  tasks,
  events,
  assets,
  sales,
  selectedClientId,
  onSelect,
}: {
  clients: Tables<"clients">[];
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at">[];
  events: Pick<Tables<"calendar_events">, "client_id" | "created_at">[];
  assets: Tables<"content_assets">[];
  sales: Pick<Tables<"client_sales">, "client_id" | "amount" | "sale_date">[];
  selectedClientId: string | null;
  onSelect: (clientId: string) => void;
}) {
  const allClientIds = clients.map((c) => c.id);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {clients.map((client) => {
        const health = activityHealth({ clientId: client.id, tasks, events, allClientIds });
        const used = tasksThisMonth(tasks, client.id);
        const limit = client.monthly_task_limit;
        const overLimit = limit != null && used > limit;
        const clientAssets = assets.filter((a) => a.client_id === client.id);
        const totalEngagement = clientAssets.reduce((sum, a) => sum + engagementScore(a), 0);
        const isSelected = client.id === selectedClientId;

        return (
          <button key={client.id} type="button" onClick={() => onSelect(client.id)}>
            <Card
              className={cn(
                "h-full text-left transition-colors hover:border-primary/40",
                isSelected && "border-primary ring-1 ring-primary"
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: colorForId(client.id) }}
                    aria-hidden
                  />
                  {client.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <HealthBar score={health} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Sales this month</span>
                  <span className="font-medium">{formatSales(salesThisMonth(sales, client.id))}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tasks this month</span>
                  <Badge variant={overLimit ? "destructive" : "secondary"}>
                    {used}
                    {limit != null ? ` / ${limit}` : ""}
                  </Badge>
                </div>
                {overLimit && (
                  <p className="text-xs text-destructive">
                    Over plan limit by {used - (limit ?? 0)} — bill for the overage.
                  </p>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Assets logged</span>
                  <span>{clientAssets.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Engagement score</span>
                  <span>{Math.round(totalEngagement).toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
