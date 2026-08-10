"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import {
  ATTACHMENT_CATEGORIES,
  MAX_ATTACHMENT_BYTES,
  PRIORITIES,
  type TaskPriority,
} from "@/lib/tasks/constants";
import { leadTimeViolation } from "@/lib/tasks/lead-time";
import type { Tables } from "@/lib/types/database.types";
import type { TaskWithRelations } from "@/components/pipeline/pipeline-board";
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
} from "@/components/ui/dialog";

function toDatetimeLocal(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// A batch is 9 separate task rows (one per location) sharing a batch_id —
// there's no single row to open a normal TaskForm on. This edits the
// shared fields across every member row at once and uploads a file to
// every member task so each location's own client portal sees it, same
// as if it had been uploaded there individually.
export function BatchTaskDialog({
  tasks,
  label,
  open,
  onOpenChange,
  onSuccess,
}: {
  tasks: TaskWithRelations[];
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (updated: Tables<"tasks">[]) => void;
}) {
  const profile = useUser();
  const first = tasks[0];
  const [title, setTitle] = useState(first.title);
  const [description, setDescription] = useState(first.description ?? "");
  const [deadline, setDeadline] = useState(toDatetimeLocal(first.deadline));
  const [priority, setPriority] = useState<TaskPriority>(first.priority as TaskPriority);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState(ATTACHMENT_CATEGORIES[0].value);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSave() {
    const deadlineIso = deadline ? new Date(deadline).toISOString() : null;
    const violation = leadTimeViolation(first.task_type, deadlineIso, true);
    if (violation) {
      toast.error(violation);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    const taskIds = tasks.map((t) => t.id);
    const { data, error } = await supabase
      .from("tasks")
      .update({ title, description: description || null, deadline: deadlineIso, priority })
      .in("id", taskIds)
      .select();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    logActivity(supabase, {
      actorId: profile.id,
      action: "batch_task_updated",
      summary: `Updated "${title}" across ${taskIds.length} locations (${label})`,
      entityType: "task_batch",
      entityId: first.batch_id ?? undefined,
    });

    toast.success(`Updated ${taskIds.length} locations`);
    onSuccess(data ?? []);
    onOpenChange(false);
  }

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error("Choose a file first");
      return;
    }

    const oversized = files.filter((f) => f.size > MAX_ATTACHMENT_BYTES);
    if (oversized.length > 0) {
      toast.error(
        oversized.length === 1
          ? `"${oversized[0].name}" is over the 50MB limit`
          : `${oversized.length} files are over the 50MB limit`
      );
      return;
    }

    setUploading(true);
    const supabase = createClient();
    let uploadedLocations = 0;
    const failed: string[] = [];

    for (const task of tasks) {
      let taskFailed = false;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const storagePath = `${task.id}/${category}/${Date.now()}-${i}-${file.name}`;

        const { error: uploadError } = await supabase.storage
          .from("task-attachments")
          .upload(storagePath, file);
        if (uploadError) {
          taskFailed = true;
          continue;
        }

        const { error: insertError } = await supabase.from("task_attachments").insert({
          task_id: task.id,
          uploaded_by: profile.id,
          category,
          storage_path: storagePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
        });
        if (insertError) taskFailed = true;
      }
      if (taskFailed) {
        failed.push(task.client?.name ?? task.id);
      } else {
        uploadedLocations++;
      }
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (uploadedLocations > 0) {
      logActivity(supabase, {
        actorId: profile.id,
        action: "batch_task_attachment_uploaded",
        summary: `Uploaded finished work for "${first.title}" to ${uploadedLocations} locations (${label})`,
        entityType: "task_batch",
        entityId: first.batch_id ?? undefined,
      });
      toast.success(`Uploaded to ${uploadedLocations} location${uploadedLocations === 1 ? "" : "s"}`);
    }
    if (failed.length > 0) {
      toast.error(`Failed for: ${failed.join(", ")}`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit &quot;{label}&quot; task</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          This task is assigned to all {tasks.length} locations in {label}. Changes below apply to
          every location at once. Each location still tracks its own status — edit that from its
          own client page.
        </p>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="batch-title">Title</Label>
            <Input id="batch-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="batch-description">Description</Label>
            <Textarea
              id="batch-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="batch-deadline">Deadline</Label>
              <Input
                id="batch-deadline"
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskPriority)}>
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
            </div>
          </div>

          <Button type="button" disabled={saving} className="w-full" onClick={handleSave}>
            {saving ? "Saving…" : `Save to all ${tasks.length} locations`}
          </Button>

          <div className="space-y-3 border-t pt-4">
            <Label>Upload finished work</Label>
            <p className="text-xs text-muted-foreground">
              Uploads the same file(s) to every location&apos;s task, so each client sees it on
              their own portal. Max 50MB per file.
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ATTACHMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                ref={inputRef}
                type="file"
                multiple
                className="block flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
              />
              <Button type="button" size="sm" disabled={uploading} onClick={handleUpload}>
                {uploading ? "Uploading…" : `Upload to all ${tasks.length}`}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
