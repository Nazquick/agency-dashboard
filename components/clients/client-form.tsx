"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser, useGroups, useAddGroup } from "@/components/providers/user-provider";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { GroupSelect } from "@/components/clients/group-select";
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

// Blank stays null ("no limit" / "no fee set"), not 0 — same convention as
// full-report-form.tsx.
const optionalNumber = () =>
  z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().min(0).optional());

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  group_id: z.string().optional(),
  monthly_credit_limit: optionalNumber(),
  credit_period: z.enum(["week", "month"]),
  monthly_fee: optionalNumber(),
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
  const groups = useGroups();
  const addGroup = useAddGroup();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ClientFormValues, unknown, ClientFormOutput>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      description: client?.description ?? "",
      group_id: client?.group_id ?? undefined,
      monthly_credit_limit: client ? (client.monthly_credit_limit ?? undefined) : 8,
      credit_period: client?.credit_period === "week" ? ("week" as const) : ("month" as const),
      monthly_fee: client?.monthly_fee ?? undefined,
    },
  });

  async function onSubmit(values: ClientFormOutput) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      name: values.name,
      description: values.description || null,
      group_id: values.group_id ?? null,
      monthly_credit_limit: values.monthly_credit_limit ?? null,
      credit_period: values.credit_period,
      monthly_fee: values.monthly_fee ?? null,
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
      <div className="space-y-2">
        <Label>Group</Label>
        <Controller
          name="group_id"
          control={control}
          render={({ field }) => (
            <GroupSelect
              groups={groups}
              value={field.value}
              onChange={field.onChange}
              onGroupCreated={addGroup}
              allowCreate={isMasterKeyUser(profile.email)}
            />
          )}
        />
        <p className="text-xs text-muted-foreground">
          Locations in the same group share a &quot;client master account&quot; that can see all of
          their tasks, dates, and analytics from one login.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="monthly_credit_limit">Credit limit</Label>
          <div className="flex gap-2">
            <Input id="monthly_credit_limit" type="number" min={0} {...register("monthly_credit_limit")} />
            <Controller
              name="credit_period"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-32 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">per week</SelectItem>
                    <SelectItem value="month">per month</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="monthly_fee">Monthly fee (kr)</Label>
          <Input id="monthly_fee" type="number" min={0} step="0.01" {...register("monthly_fee")} />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Standard credit is 8/month, weighted by content type; weekly limits reset every Monday. Leave the limit blank for no cap. The
        monthly fee is required before this client can top up credits from the portal (top-up costs
        50% of it).
      </p>
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : client ? "Save changes" : "Create client"}
      </Button>
    </form>
  );
}
