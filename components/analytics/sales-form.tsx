"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Tables } from "@/lib/types/database.types";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const saleSchema = z.object({
  amount: z.coerce.number().positive("Must be greater than 0"),
  sale_date: z.string().min(1, "Date is required"),
  note: z.string().optional(),
});

type SaleFormValues = z.input<typeof saleSchema>;
type SaleFormOutput = z.output<typeof saleSchema>;

export function SalesForm({
  clientId,
  trigger,
  onSuccess,
}: {
  clientId: string;
  trigger: React.ReactNode;
  onSuccess?: (sale: Tables<"client_sales">) => void;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SaleFormValues, unknown, SaleFormOutput>({
    resolver: zodResolver(saleSchema),
    defaultValues: { amount: undefined, sale_date: todayIso(), note: "" },
  });

  async function onSubmit(values: SaleFormOutput) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_sales")
      .insert({
        client_id: clientId,
        amount: values.amount,
        sale_date: values.sale_date,
        note: values.note || null,
        created_by: profile.id,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Sale logged");
    onSuccess?.(data);
    reset({ amount: undefined, sale_date: todayIso(), note: "" });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Log a sale</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="sale-amount">Amount (kr)</Label>
              <Input
                id="sale-amount"
                type="number"
                min={0}
                step="0.01"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="sale-date">Date</Label>
              <Input id="sale-date" type="date" {...register("sale_date")} />
              {errors.sale_date && (
                <p className="text-sm text-destructive">{errors.sale_date.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-note">Note (optional)</Label>
            <Input id="sale-note" placeholder="e.g. weekend promo" {...register("note")} />
          </div>
          <p className="text-xs text-muted-foreground">
            A rough figure is fine — this is for spotting trends, not bookkeeping.
          </p>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Logging…" : "Log sale"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
