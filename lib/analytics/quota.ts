import type { Tables } from "@/lib/types/database.types";
import { tasksThisMonth, tasksInQuarter } from "@/lib/analytics/metrics";

export interface ClientQuotaStatus {
  client: Pick<Tables<"clients">, "id" | "name" | "monthly_task_limit" | "quarterly_task_limit">;
  monthlyUsed: number;
  monthlyLimit: number | null;
  overMonthly: boolean;
  quarterlyUsed: number;
  quarterlyLimit: number | null;
  overQuarterly: boolean;
}

// Single source of truth for "is this client over their credit" — shared by
// the Admin nav badge and the Client quotas panel so their numbers can't
// drift apart.
export function computeQuotaStatus(
  clients: Pick<Tables<"clients">, "id" | "name" | "monthly_task_limit" | "quarterly_task_limit">[],
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at">[]
): ClientQuotaStatus[] {
  return clients.map((client) => {
    const monthlyUsed = tasksThisMonth(tasks, client.id);
    const quarterlyUsed = tasksInQuarter(tasks, client.id);
    const monthlyLimit = client.monthly_task_limit;
    const quarterlyLimit = client.quarterly_task_limit;
    return {
      client,
      monthlyUsed,
      monthlyLimit,
      overMonthly: monthlyLimit != null && monthlyUsed > monthlyLimit,
      quarterlyUsed,
      quarterlyLimit,
      overQuarterly: quarterlyLimit != null && quarterlyUsed > quarterlyLimit,
    };
  });
}
