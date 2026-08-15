"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import { MAX_ATTACHMENT_BYTES } from "@/lib/tasks/constants";
import { MAX_POST_ATTACHMENTS } from "@/lib/social-posts/constants";
import { sanitizeStorageFilename } from "@/lib/storage/filename";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AttachmentRow = Tables<"social_post_attachments"> & {
  uploader: { id: string; full_name: string } | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PostAttachments({
  postId,
  postLabel,
  readOnly = false,
}: {
  postId: string;
  postLabel: string;
  readOnly?: boolean;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const inputRef = useRef<HTMLInputElement>(null);
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
        .from("social_post_attachments")
        .select("*, uploader:profiles(id, full_name)")
        .eq("post_id", postId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as AttachmentRow[];
      if (cancelled) return;
      setAttachments(rows);
      setLoading(false);

      const entries = await Promise.all(
        rows.map(async (row) => {
          const { data: signed } = await supabase.storage
            .from("social-post-attachments")
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
        .channel(`post-attachments-${postId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "social_post_attachments" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [postId]);

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error("Choose a file first");
      return;
    }

    if (files.length > MAX_POST_ATTACHMENTS) {
      toast.error(`Upload at most ${MAX_POST_ATTACHMENTS} files at a time`);
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
      const storagePath = `${postId}/${Date.now()}-${i}-${sanitizeStorageFilename(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("social-post-attachments")
        .upload(storagePath, file);

      if (uploadError) {
        failed.push(file.name);
        continue;
      }

      const { error: insertError } = await supabase.from("social_post_attachments").insert({
        post_id: postId,
        uploaded_by: profile.id,
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
        action: "post_attachment_uploaded",
        summary: `Uploaded "${file.name}" to post "${postLabel}"`,
        entityType: "social_post",
        entityId: postId,
      });
    }

    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";

    if (uploaded > 0) {
      toast.success(uploaded === 1 ? "File uploaded — the admin has been notified" : `${uploaded} files uploaded — the admin has been notified`);
    }
    if (failed.length > 0) {
      toast.error(`Failed to upload: ${failed.join(", ")}`);
    }
  }

  async function handleDelete(attachment: AttachmentRow) {
    if (!window.confirm(`Remove "${attachment.file_name}"?`)) return;
    const supabase = createClient();
    await supabase.storage.from("social-post-attachments").remove([attachment.storage_path]);
    const { error } = await supabase.from("social_post_attachments").delete().eq("id", attachment.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    logActivity(supabase, {
      actorId: profile.id,
      action: "post_attachment_deleted",
      summary: `Removed "${attachment.file_name}" from post "${postLabel}"`,
      entityType: "social_post",
      entityId: postId,
    });
    toast.success("File removed");
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <Label>Files</Label>

      {!readOnly && (
        <>
          <div className="flex flex-wrap items-end gap-2">
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
          <p className="text-xs text-muted-foreground">
            Max 50MB per file, up to {MAX_POST_ATTACHMENTS} files at once. The admin gets notified on every upload.
          </p>
        </>
      )}

      {!loading && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No files yet.</p>
      )}

      {attachments.length > 0 && (
        <ul className="space-y-1">
          {attachments.map((a) => (
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
              {!readOnly && (a.uploaded_by === profile.id || leader) && (
                <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(a)}>
                  Remove
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
