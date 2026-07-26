"use client";

import { useMemo, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatSales } from "@/lib/analytics/sales";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const transactionSchema = z.object({
  type: z.enum(["income", "expense"]),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().positive("Must be greater than 0"),
  description: z.string().optional(),
  transaction_date: z.string().min(1, "Date is required"),
});

type TransactionFormValues = z.input<typeof transactionSchema>;
type TransactionFormOutput = z.output<typeof transactionSchema>;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function CompanyFinances({
  initialTransactions,
  salaryTotal,
}: {
  initialTransactions: Tables<"company_transactions">[];
  salaryTotal: number;
}) {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TransactionFormValues, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: "expense",
      category: "",
      amount: undefined,
      description: "",
      transaction_date: todayIso(),
    },
  });

  const { manualIncome, totalExpenses, net } = useMemo(() => {
    const income = transactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const expenses = transactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const total = expenses + salaryTotal;
    return { manualIncome: income, manualExpenses: expenses, totalExpenses: total, net: income - total };
  }, [transactions, salaryTotal]);

  async function onSubmit(values: TransactionFormOutput) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("company_transactions")
      .insert({
        type: values.type,
        category: values.category,
        amount: values.amount,
        description: values.description || null,
        transaction_date: values.transaction_date,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    setTransactions((prev) => [data, ...prev]);
    toast.success("Transaction added");
    reset({ type: "expense", category: "", amount: undefined, description: "", transaction_date: todayIso() });
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Total income</p>
          <p className="text-xl font-semibold text-green-600 dark:text-green-400">
            {formatSales(manualIncome)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">
            Total expenses <span className="opacity-70">(incl. {formatSales(salaryTotal)} salaries)</span>
          </p>
          <p className="text-xl font-semibold text-red-600 dark:text-red-400">
            {formatSales(totalExpenses)}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Net</p>
          <p className={`text-xl font-semibold ${net >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            {formatSales(net)}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-3 rounded-lg border p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-category">Category</Label>
          <Input id="finance-category" placeholder="e.g. Retainer, Software" {...register("category")} />
          {errors.category && <p className="text-sm text-destructive">{errors.category.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-amount">Amount (kr)</Label>
          <Input id="finance-amount" type="number" min={0} step="0.01" {...register("amount")} />
          {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="finance-date">Date</Label>
          <Input id="finance-date" type="date" {...register("transaction_date")} />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="finance-description">Description</Label>
          <Input id="finance-description" placeholder="Optional" {...register("description")} />
        </div>
        <Button type="submit" disabled={loading} className="sm:col-span-2">
          {loading ? "Adding…" : "Add transaction"}
        </Button>
      </form>

      <div className="space-y-2">
        {transactions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions logged yet.</p>
        ) : (
          transactions.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-md border p-2.5 text-sm">
              <div className="flex items-center gap-2">
                <Badge
                  className={
                    t.type === "income"
                      ? "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400"
                      : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400"
                  }
                >
                  {t.type === "income" ? "Income" : "Expense"}
                </Badge>
                <div>
                  <p className="font-medium">{t.category}</p>
                  {t.description && <p className="text-xs text-muted-foreground">{t.description}</p>}
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatSales(Number(t.amount))}</p>
                <p className="text-xs text-muted-foreground">{t.transaction_date}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
