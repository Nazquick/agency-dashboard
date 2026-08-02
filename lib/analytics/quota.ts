import type { Tables } from "@/lib/types/database.types";
import { creditsUsedInMonth, currentPeriodStart } from "@/lib/analytics/metrics";

export interface ClientCreditStatus {
  client: Pick<Tables<"clients">, "id" | "name" | "monthly_credit_limit">;
  used: number;
  baseLimit: number | null;
  topupCredits: number;
  limit: number | null;
  over: boolean;
}

// Single source of truth for "is this client over their monthly credit" —
// shared by the Admin nav badge and the Client quotas panel so their
// numbers can't drift apart. A null monthly_credit_limit means unlimited.
export function computeCreditStatus(
  clients: Pick<Tables<"clients">, "id" | "name" | "monthly_credit_limit">[],
  tasks: Pick<Tables<"tasks">, "client_id" | "created_at" | "task_type" | "archived">[],
  topups: Pick<Tables<"credit_topups">, "client_id" | "period_start" | "credits_added">[]
): ClientCreditStatus[] {
  const periodStart = currentPeriodStart();

  return clients.map((client) => {
    const used = creditsUsedInMonth(tasks, client.id);
    const baseLimit = client.monthly_credit_limit;
    const topupCredits = topups
      .filter((t) => t.client_id === client.id && t.period_start === periodStart)
      .reduce((sum, t) => sum + t.credits_added, 0);
    const limit = baseLimit == null ? null : baseLimit + topupCredits;
    return {
      client,
      used,
      baseLimit,
      topupCredits,
      limit,
      over: limit != null && used > limit,
    };
  });
}
