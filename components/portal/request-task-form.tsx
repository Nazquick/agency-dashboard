"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import { CONTENT_TYPES, PRIORITIES } from "@/lib/tasks/constants";
import { leadTimeViolation } from "@/lib/tasks/lead-time";
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
import { Card, CardContent } from "@/components/ui/card";

const NONE = "__none__";

const requestSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export function RequestTaskForm({ clientId }: { clientId: string }) {
  const profile = useUser();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      title: "",
      description: "",
      task_type: undefined,
      deadline: "",
      priority: "medium",
    },
  });

  async function onSubmit(values: RequestFormValues) {
    const deadlineIso = values.deadline ? new Date(values.deadline).toISOString() : null;
    const violation = leadTimeViolation(values.task_type, deadlineIso, true);
    if (violation) {
      toast.error(violation);
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("tasks")
      .insert({
        title: values.title,
        description: values.description || null,
        task_type: values.task_type || null,
        client_id: clientId,
        deadline: deadlineIso,
        priority: values.priority,
        status: "not_started",
        assignee_id: null,
        source: "client",
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
      action: "task_requested",
      summary: `Requested task "${values.title}"`,
      entityType: "task",
      entityId: data.id,
    });

    toast.success("Sent to the team");
    reset({ title: "", description: "", task_type: undefined, deadline: "", priority: "medium" });
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Request a task</h1>
        <p className="text-sm text-muted-foreground">
          Tell the team what you need — they&apos;ll triage it into the pipeline.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="request-title">Title</Label>
              <Input id="request-title" {...register("title")} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="request-description">Description</Label>
              <Textarea id="request-description" rows={4} {...register("description")} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Controller
                  name="task_type"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value ?? NONE}
                      onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>None</SelectItem>
                        {CONTENT_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
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

            <div className="space-y-2">
              <Label htmlFor="request-deadline">Deadline (optional)</Label>
              <Input id="request-deadline" type="datetime-local" {...register("deadline")} />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Send request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
