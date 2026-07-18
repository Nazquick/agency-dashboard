"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientSchema>;

export function ClientForm({
  client,
  onSuccess,
}: {
  client?: Tables<"clients">;
  onSuccess?: (client: Tables<"clients">) => void;
}) {
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: client?.name ?? "",
      description: client?.description ?? "",
    },
  });

  async function onSubmit(values: ClientFormValues) {
    setLoading(true);
    const supabase = createClient();

    const result = client
      ? await supabase
          .from("clients")
          .update({ name: values.name, description: values.description || null })
          .eq("id", client.id)
          .select()
          .single()
      : await supabase
          .from("clients")
          .insert({ name: values.name, description: values.description || null })
          .select()
          .single();

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(client ? "Client updated" : "Client created");
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
      <Button type="submit" disabled={loading}>
        {loading ? "Saving…" : client ? "Save changes" : "Create client"}
      </Button>
    </form>
  );
}
