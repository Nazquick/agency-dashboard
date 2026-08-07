"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import { PRIORITIES } from "@/lib/tasks/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const NONE = "__none__";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  payout_amount: z.coerce.number().positive("Enter a payout amount"),
  client_id: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  deadline: z.string().optional(),
});

type FormValues = z.input<typeof schema>;
type FormOutput = z.output<typeof schema>;

export function CreateSpecialTaskDialog({
  clients,
  onSuccess,
}: {
  clients: Pick<Tables<"clients">, "id" | "name">[];
  onSuccess: (task: Tables<"tasks">) => void;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues, unknown, FormOutput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      payout_amount: undefined,
      client_id: undefined,
      priority: "medium",
      deadline: "",
    },
  });

  async function onSubmit(values: FormOutput) {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: values.title,
        description: values.description || null,
        client_id: values.client_id || null,
        priority: values.priority,
        status: "not_started",
        deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
        is_special: true,
        payout_amount: values.payout_amount,
        source: "manual",
      })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    logActivity(supabase, {
      actorId: profile.id,
      action: "special_task_created",
      summary: `Posted a bounty: "${values.title}" (${values.payout_amount} kr)`,
      entityType: "task",
      entityId: data.id,
    });

    toast.success("Bounty posted");
    setOpen(false);
    reset();
    onSuccess(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>+ New bounty</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post a special task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bounty-title">Title</Label>
            <Input id="bounty-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bounty-description">Description</Label>
            <Textarea id="bounty-description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bounty-payout">Payout (kr)</Label>
              <Input id="bounty-payout" type="number" step="1" min="0" {...register("payout_amount")} />
              {errors.payout_amount && (
                <p className="text-sm text-destructive">{errors.payout_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bounty-deadline">Deadline (optional)</Label>
              <Input id="bounty-deadline" type="datetime-local" {...register("deadline")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client (optional)</Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="No client" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No client (internal)</SelectItem>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Posting…" : "Post bounty"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
