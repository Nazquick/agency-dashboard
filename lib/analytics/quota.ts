import type { Tables } from "@/lib/types/database.types";
import {
  asCreditPeriod,
  creditsUsedInPeriod,
  currentPeriodStart,
  type CreditPeriod,
} from "@/lib/analytics/metrics";

export type QuotaClient = Pick<
  Tables<"clients">,
  "id" | "name" | "monthly_credit_limit" | "credit_period"
>;

export interface ClientCreditStatus {
  client: QuotaClient;
  period: CreditPeriod;
  used: number;
  baseLimit: number | null;
  topupCredits: number;
  limit: number | null;
  over: boolean;
}

// Single source of truth for "is this client over their credit for the
// current week/month" — shared by the Admin nav badge and the Client quotas
// panel so their numbers can't drift apart. A null monthly_credit_limit
// means unlimited.
export function computeCreditStatus(
  clients: QuotaClient[],
  tasks: Pick<Tables<"tasks">, "client_id" | "credit_client_id" | "created_at" | "task_type" | "archived">[],
  topups: Pick<Tables<"credit_topups">, "client_id" | "period_start" | "credits_added">[]
): ClientCreditStatus[] {
  return clients.map((client) => {
    const period = asCreditPeriod(client.credit_period);
    const periodStart = currentPeriodStart(period);
    const used = creditsUsedInPeriod(tasks, client.id, period);
    const baseLimit = client.monthly_credit_limit;
    const topupCredits = topups
      .filter((t) => t.client_id === client.id && t.period_start === periodStart)
      .reduce((sum, t) => sum + t.credits_added, 0);
    const limit = baseLimit == null ? null : baseLimit + topupCredits;
    return {
      client,
      period,
      used,
      baseLimit,
      topupCredits,
      limit,
      over: limit != null && used > limit,
    };
  });
}
