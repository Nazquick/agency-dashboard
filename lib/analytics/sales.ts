import { startOfCurrentMonthIso } from "@/lib/analytics/metrics";
import type { Tables } from "@/lib/types/database.types";

export type ClientSale = Tables<"client_sales">;

export function salesThisMonth(sales: Pick<ClientSale, "client_id" | "amount" | "sale_date">[], clientId: string): number {
  const start = startOfCurrentMonthIso().slice(0, 10);
  return sales
    .filter((s) => s.client_id === clientId && s.sale_date >= start)
    .reduce((sum, s) => sum + Number(s.amount), 0);
}

export function formatSales(amount: number): string {
  return `${Math.round(amount).toLocaleString()} kr`;
}
