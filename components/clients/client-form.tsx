"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Blank stays null ("no limit"), not 0 — same convention as full-report-form.tsx.
const limit = () =>
  z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().int().min(0).optional());

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  monthly_task_limit: limit(),
  quarterly_task_limit: limit(),
});

type ClientFormValues = z.input<typeof clientSchema>;
type ClientFormOutput = z.output<typeof clientSchema>;

export function ClientForm({
  client,
  onSuccess,
}: {
  client?: Tables<"clients">;
  onSuccess?: (client: Tables<"clients">) => void;
}) {
  const profile = useUser();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues, unknown, ClientFormOutput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      description: client?.description ?? "",
      monthly_task_limit: client ? (client.monthly_task_limit ?? undefined) : 16,
      quarterly_task_limit: client ? (client.quarterly_task_limit ?? undefined) : 40,
    },
  });

  async function onSubmit(values: ClientFormOutput) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      name: values.name,
      description: values.description || null,
      monthly_task_limit: values.monthly_task_limit ?? null,
      quarterly_task_limit: values.quarterly_task_limit ?? null,
    };

    const result = client
      ? await supabase.from("clients").update(payload).eq("id", client.id).select().single()
      : await supabase.from("clients").insert(payload).select().single();

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(client ? "Client updated" : "Client created");
    logActivity(supabase, {
      actorId: profile.id,
      action: client ? "client_updated" : "client_created",
      summary: `${client ? "Updated" : "Created"} client "${values.name}"`,
      entityType: "client",
      entityId: result.data.id,
    });
    onSuccess?.(result.data);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Client name</Label>
        <Input id="name" {...register("name")} />
        {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={4} {...register("description")} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthly_task_limit">Monthly task limit</Label>
          <Input id="monthly_task_limit" type="number" min={0} {...register("monthly_task_limit")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="quarterly_task_limit">Quarterly task limit</Label>
          <Input id="quarterly_task_limit" type="number" min={0} {...register("quarterly_task_limit")} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Standard credit is 4 tasks/assets a week (~16/month, 40/quarter). Leave blank for no limit.
      </p>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : client ? "Save changes" : "Create client"}
      </Button>
    </form>
  );
}
