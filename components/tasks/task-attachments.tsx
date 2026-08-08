"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { ATTACHMENT_CATEGORIES, MAX_ATTACHMENT_BYTES } from "@/lib/tasks/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AttachmentRow = Tables<"task_attachments"> & {
  uploader: { id: string; full_name: string } | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function TaskAttachments({ taskId, taskTitle }: { taskId: string; taskTitle: string }) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const inputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState(ATTACHMENT_CATEGORIES[0].value);
  const [attachments, setAttachments] = useState<AttachmentRow[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("task_attachments")
        .select("*, uploader:profiles(id, full_name)")
        .eq("task_id", taskId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as AttachmentRow[];
      if (cancelled) return;
      setAttachments(rows);
      setLoading(false);

      const entries = await Promise.all(
        rows.map(async (row) => {
          const { data: signed } = await supabase.storage
            .from("task-attachments")
            .createSignedUrl(row.storage_path, 60 * 60);
          return [row.id, signed?.signedUrl ?? ""] as const;
        })
      );
      if (!cancelled) setUrls(Object.fromEntries(entries));
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      await refetch();
      channel = supabase
        .channel(`task-attachments-${taskId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "task_attachments" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [taskId]);

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
    const failed: string[] = [];
    let uploaded = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const storagePath = `${taskId}/${category}/${Date.now()}-${i}-${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(storagePath, file);

      if (uploadError) {
        failed.push(file.name);
        continue;
      }

      const { error: insertError } = await supabase.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: profile.id,
        category,
        storage_path: storagePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type || null,
      });

      if (insertError) {
        failed.push(file.name);
        continue;
      }

      uploaded++;
      logActivity(supabase, {
        actorId: profile.id,
        action: "task_attachment_uploaded",
        summary: `Uploaded "${file.name}" to task "${taskTitle}"`,
        entityType: "task",
        entityId: taskId,
      });
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (uploaded > 0) {
      toast.success(uploaded === 1 ? "File uploaded" : `${uploaded} files uploaded`);
    }
    if (failed.length > 0) {
      toast.error(`Failed to upload: ${failed.join(", ")}`);
    }
  }

  async function handleDelete(attachment: AttachmentRow) {
    if (!window.confirm(`Remove "${attachment.file_name}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("task-attachments").remove([attachment.storage_path]);
    const { error } = await supabase.from("task_attachments").delete().eq("id", attachment.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    logActivity(supabase, {
      actorId: profile.id,
      action: "task_attachment_deleted",
      summary: `Removed "${attachment.file_name}" from task "${taskTitle}"`,
      entityType: "task",
      entityId: taskId,
    });
    toast.success("File removed");
  }

  const grouped = ATTACHMENT_CATEGORIES.map((c) => ({
    ...c,
    items: attachments.filter((a) => a.category === c.value),
  }));

  return (
    <div className="space-y-3 border-t pt-4">
      <Label>Attachments</Label>

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
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">Max 50MB per file. You can select multiple files.</p>

      {!loading && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      )}

      {grouped
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.value} className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{g.label}</p>
            <ul className="space-y-1">
              {g.items.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 text-sm">
                  <div className="min-w-0 flex-1 truncate">
                    {urls[a.id] ? (
                      <a
                        href={urls[a.id]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-4"
                      >
                        {a.file_name}
                      </a>
                    ) : (
                      <span>{a.file_name}</span>
                    )}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {formatBytes(a.file_size)} · {a.uploader?.full_name ?? "Unknown"}
                    </span>
                  </div>
                  {(a.uploaded_by === profile.id || leader) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(a)}
                    >
                      Remove
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
    </div>
  );
}
