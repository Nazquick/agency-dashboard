"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logActivity } from "@/lib/activity/log";
import { useUser, useGroups } from "@/components/providers/user-provider";
import { TaskAttachments } from "@/components/tasks/task-attachments";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const NONE = "__none__";

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskQuickEdit({
  task,
  clients,
  profiles,
  onUpdate,
}: {
  task: Pick<Tables<"tasks">, "id" | "title" | "client_id" | "deadline">;
  clients: Pick<Tables<"clients">, "id" | "name">[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_external">[];
  onUpdate: (updated: Tables<"tasks">, assigneeIds: string[]) => void;
}) {
  const profile = useUser();
  const groups = useGroups();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState(task.client_id ?? NONE);
  const [deadline, setDeadline] = useState(toDatetimeLocal(task.deadline));
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    setClientId(task.client_id ?? NONE);
    setDeadline(toDatetimeLocal(task.deadline));
    const supabase = createClient();
    supabase
      .from("task_assignees")
      .select("profile_id")
      .eq("task_id", task.id)
      .then(({ data }) => {
        if (data) setAssigneeIds(data.map((row) => row.profile_id));
      });
  }

  const allClientGroup = groups.find((g) => g.all_client_id === clientId);

  async function handleSave() {
    setLoading(true);
    const supabase = createClient();
    const deadlineIso = deadline ? new Date(deadline).toISOString() : null;

    let creditClientId: string | null = null;
    if (allClientGroup) {
      const pickRes = await fetch("/api/tasks/pick-group-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: allClientGroup.id }),
      });
      const pickBody = await pickRes.json();
      if (!pickRes.ok) {
        setLoading(false);
        toast.error(pickBody.error ?? "Failed to pick a location for this group");
        return;
      }
      creditClientId = pickBody.clientId;
    }

    const { data, error } = await supabase
      .from("tasks")
      .update({
        client_id: clientId === NONE ? null : clientId,
        credit_client_id: creditClientId,
        deadline: deadlineIso,
        assignee_id: assigneeIds[0] ?? null,
      })
      .eq("id", task.id)
      .select()
      .single();

    if (error || !data) {
      setLoading(false);
      toast.error(error?.message ?? "Failed to update task");
      return;
    }

    await supabase.from("task_assignees").delete().eq("task_id", task.id);
    if (assigneeIds.length > 0) {
      const { error: assigneesError } = await supabase
        .from("task_assignees")
        .insert(assigneeIds.map((profileId) => ({ task_id: task.id, profile_id: profileId })));
      if (assigneesError) toast.error(`Assignees not saved: ${assigneesError.message}`);
    }

    setLoading(false);
    toast.success("Task updated");
    logActivity(supabase, {
      actorId: profile.id,
      action: "task_updated",
      summary: `Updated task "${data.title}"`,
      entityType: "task",
      entityId: task.id,
    });
    onUpdate(data, assigneeIds);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-sm" title="Quick edit">
          <Pencil className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-4" align="end">
        <div className="space-y-2">
          <Label>Client</Label>
          <Select value={clientId} onValueChange={setClientId}>
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
          {allClientGroup && (
            <p className="text-xs text-muted-foreground">
              Charges credit to whichever location in this group has room left this month.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>Assignees</Label>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
            {profiles
              .filter((p) => !p.is_external)
              .map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <Checkbox
                    checked={assigneeIds.includes(p.id)}
                    onCheckedChange={(checked) =>
                      setAssigneeIds((prev) =>
                        checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  {p.full_name}
                </label>
              ))}
            {profiles.some((p) => p.is_external) && (
              <>
                <p className="pt-1.5 text-xs font-medium text-muted-foreground">External team</p>
                {profiles
                  .filter((p) => p.is_external)
                  .map((p) => (
                    <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                      <Checkbox
                        checked={assigneeIds.includes(p.id)}
                        onCheckedChange={(checked) =>
                          setAssigneeIds((prev) =>
                            checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                          )
                        }
                      />
                      {p.full_name}
                    </label>
                  ))}
              </>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`quick-deadline-${task.id}`}>Deadline</Label>
          <Input
            id={`quick-deadline-${task.id}`}
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>

        <Button className="w-full" size="sm" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>

        <TaskAttachments taskId={task.id} taskTitle={task.title} />
      </PopoverContent>
    </Popover>
  );
}
