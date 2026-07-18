"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader, roleLabel } from "@/lib/auth/roles";
import { TASK_TYPES, PRIORITIES, STATUSES } from "@/lib/tasks/constants";
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
const NO_TEMPLATE = "__no_template__";

type TemplateWithSteps = Tables<"task_templates"> & {
  task_template_steps: Tables<"task_template_steps">[];
};

interface StepDraft {
  key: string;
  description: string;
  estimated_minutes: string;
  software: string;
  equipment: string;
  transportation: string;
  other_cost: string;
}

function newStepDraft(): StepDraft {
  return {
    key: crypto.randomUUID(),
    description: "",
    estimated_minutes: "",
    software: "",
    equipment: "",
    transportation: "",
    other_cost: "",
  };
}

function stepDraftFromRow(row: {
  description: string;
  estimated_minutes: number | null;
  software: string | null;
  equipment: string | null;
  transportation: string | null;
  other_cost: string | null;
}): StepDraft {
  return {
    key: crypto.randomUUID(),
    description: row.description,
    estimated_minutes: row.estimated_minutes != null ? String(row.estimated_minutes) : "",
    software: row.software ?? "",
    equipment: row.equipment ?? "",
    transportation: row.transportation ?? "",
    other_cost: row.other_cost ?? "",
  };
}

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  task_type: z.string().optional(),
  client_id: z.string().optional(),
  assignee_id: z.string().optional(),
  deadline: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["not_started", "in_progress", "blocked", "review", "done"]),
});

type TaskFormValues = z.infer<typeof taskSchema>;

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskForm({
  task,
  clients,
  profiles,
  defaultClientId,
  defaultAssigneeId,
  trigger,
  onSuccess,
  onDelete,
}: {
  task?: Tables<"tasks">;
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role">[];
  defaultClientId?: string;
  defaultAssigneeId?: string;
  trigger: React.ReactNode;
  onSuccess?: (task: Tables<"tasks">) => void;
  onDelete?: (taskId: string) => void;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [steps, setSteps] = useState<StepDraft[]>([]);
  const [templates, setTemplates] = useState<TemplateWithSteps[]>([]);
  const [templateId, setTemplateId] = useState(NO_TEMPLATE);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      task_type: task?.task_type ?? undefined,
      client_id: task?.client_id ?? defaultClientId ?? undefined,
      assignee_id: task?.assignee_id ?? defaultAssigneeId ?? undefined,
      deadline: toDatetimeLocal(task?.deadline ?? null),
      priority: task?.priority ?? "medium",
      status: task?.status ?? "not_started",
    },
  });

  useEffect(() => {
    if (!open) return;
    const supabase = createClient();

    supabase
      .from("task_templates")
      .select("*, task_template_steps(*)")
      .order("name")
      .then(({ data }) => {
        if (data) {
          setTemplates(
            (data as unknown as TemplateWithSteps[]).map((t) => ({
              ...t,
              task_template_steps: [...t.task_template_steps].sort((a, b) => a.position - b.position),
            }))
          );
        }
      });

    if (task) {
      supabase
        .from("task_steps")
        .select("*")
        .eq("task_id", task.id)
        .order("position")
        .then(({ data }) => {
          if (data) setSteps(data.map(stepDraftFromRow));
        });
    }
  }, [open, task]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next && !task) {
      setSteps([]);
      setTemplateId(NO_TEMPLATE);
    }
  }

  function applyTemplate(id: string) {
    setTemplateId(id);
    if (id === NO_TEMPLATE) return;
    const template = templates.find((t) => t.id === id);
    if (!template) return;
    setSteps(template.task_template_steps.map(stepDraftFromRow));
  }

  function addStep() {
    setSteps((prev) => [...prev, newStepDraft()]);
  }

  function removeStep(key: string) {
    setSteps((prev) => prev.filter((s) => s.key !== key));
  }

  function updateStep(key: string, patch: Partial<StepDraft>) {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }

  async function assessAndAssignRole(
    taskId: string,
    title: string,
    description: string | null,
    taskType: string | null
  ) {
    try {
      const res = await fetch("/api/tasks/assess-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, task_type: taskType }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "AI role assessment failed");
        return null;
      }
      const { role } = (await res.json()) as { role: Tables<"profiles">["role"] };
      const assignee = profiles.find((p) => p.role === role);
      if (!assignee) return null;

      const supabase = createClient();
      const { error } = await supabase.from("tasks").update({ assignee_id: assignee.id }).eq("id", taskId);
      if (error) {
        toast.error(error.message);
        return null;
      }
      toast.success(`AI assigned this task to ${assignee.full_name} (${roleLabel(role)})`);
      return assignee;
    } catch {
      toast.error("AI role assessment failed");
      return null;
    }
  }

  async function handleArchiveToggle() {
    if (!task) return;
    setArchiving(true);
    const supabase = createClient();
    const nextArchived = !task.archived;
    const { data, error } = await supabase
      .from("tasks")
      .update({ archived: nextArchived })
      .eq("id", task.id)
      .select()
      .single();
    setArchiving(false);

    if (error || !data) {
      toast.error(error?.message ?? "Failed to update task");
      return;
    }

    toast.success(nextArchived ? "Task archived" : "Task unarchived");
    setOpen(false);
    onSuccess?.(data);
  }

  async function handleDelete() {
    if (!task) return;
    if (!window.confirm(`Delete "${task.title}"? This can't be undone.`)) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    setDeleting(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Task deleted");
    setOpen(false);
    onDelete?.(task.id);
  }

  async function onSubmit(values: TaskFormValues) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      title: values.title,
      description: values.description || null,
      task_type: values.task_type || null,
      client_id: values.client_id || null,
      assignee_id: values.assignee_id || null,
      deadline: values.deadline ? new Date(values.deadline).toISOString() : null,
      priority: values.priority,
      status: values.status,
    };

    const result = task
      ? await supabase.from("tasks").update(payload).eq("id", task.id).select().single()
      : await supabase.from("tasks").insert(payload).select().single();

    if (result.error) {
      setLoading(false);
      toast.error(result.error.message);
      return;
    }

    const taskId = result.data.id;
    const validSteps = steps.filter((s) => s.description.trim().length > 0);

    if (task) {
      await supabase.from("task_steps").delete().eq("task_id", taskId);
    }
    if (validSteps.length > 0) {
      const { error: stepsError } = await supabase.from("task_steps").insert(
        validSteps.map((s, index) => ({
          task_id: taskId,
          position: index + 1,
          description: s.description,
          estimated_minutes: s.estimated_minutes ? Number(s.estimated_minutes) : null,
          software: s.software || null,
          equipment: s.equipment || null,
          transportation: s.transportation || null,
          other_cost: s.other_cost || null,
        }))
      );
      if (stepsError) toast.error(`Steps not saved: ${stepsError.message}`);
    }

    if (!task && !payload.assignee_id && payload.priority !== "urgent") {
      const assignee = await assessAndAssignRole(taskId, payload.title, payload.description, payload.task_type);
      if (assignee) result.data.assignee_id = assignee.id;
    }

    setLoading(false);
    toast.success(task ? "Task updated" : "Task created");
    setOpen(false);
    if (!task) {
      reset();
      setSteps([]);
      setTemplateId(NO_TEMPLATE);
    }
    onSuccess?.(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task ? "Edit task" : "New task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {templates.length > 0 && (
            <div className="space-y-2">
              <Label>Start from template</Label>
              <Select value={templateId} onValueChange={applyTemplate}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_TEMPLATE}>None</SelectItem>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" rows={3} {...register("description")} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Task type</Label>
              <Controller
                name="task_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>None</SelectItem>
                      {TASK_TYPES.map((t) => (
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
              <Label>Client</Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE}
                    onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}
                    disabled={Boolean(defaultClientId)}
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
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Assignee</Label>
              <Controller
                name="assignee_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? NONE} onValueChange={(v) => field.onChange(v === NONE ? undefined : v)}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>Unassigned</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.full_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" type="datetime-local" {...register("deadline")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
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

            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Steps</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus /> Add step
              </Button>
            </div>

            {steps.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No steps yet. Add steps or start from a template above.
              </p>
            ) : (
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.key} className="space-y-2 rounded-md border p-3">
                    <div className="flex items-start gap-2">
                      <span className="mt-2 text-xs text-muted-foreground">{index + 1}.</span>
                      <div className="flex-1 space-y-2">
                        <Input
                          placeholder="Step description"
                          value={step.description}
                          onChange={(e) => updateStep(step.key, { description: e.target.value })}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            min={0}
                            placeholder="Minutes"
                            value={step.estimated_minutes}
                            onChange={(e) => updateStep(step.key, { estimated_minutes: e.target.value })}
                          />
                          <Input
                            placeholder="Software"
                            value={step.software}
                            onChange={(e) => updateStep(step.key, { software: e.target.value })}
                          />
                          <Input
                            placeholder="Equipment"
                            value={step.equipment}
                            onChange={(e) => updateStep(step.key, { equipment: e.target.value })}
                          />
                          <Input
                            placeholder="Transportation"
                            value={step.transportation}
                            onChange={(e) => updateStep(step.key, { transportation: e.target.value })}
                          />
                          <Input
                            className="col-span-2"
                            placeholder="Other cost"
                            value={step.other_cost}
                            onChange={(e) => updateStep(step.key, { other_cost: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStep(step.key)}
                        aria-label="Remove step"
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : task ? "Save changes" : "Create task"}
          </Button>

          {task && (
            <div className="flex gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={archiving}
                onClick={handleArchiveToggle}
              >
                {archiving ? "Saving…" : task.archived ? "Unarchive" : "Archive"}
              </Button>
              {leader && (
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 text-destructive hover:text-destructive"
                  disabled={deleting}
                  onClick={handleDelete}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </Button>
              )}
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
