"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import { MAX_ATTACHMENT_BYTES } from "@/lib/tasks/constants";
import { MAX_CAMPAIGN_ATTACHMENTS } from "@/lib/campaigns/constants";
import { sanitizeStorageFilename } from "@/lib/storage/filename";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type AttachmentRow = Tables<"campaign_attachments"> & {
  uploader: { id: string; full_name: string } | null;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isImage(mimeType: string | null): boolean {
  return (mimeType ?? "").startsWith("image/");
}

export function CampaignAttachments({ campaignId, campaignLabel }: { campaignId: string; campaignLabel: string }) {
  const profile = useUser();
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
        .from("campaign_attachments")
        .select("*, uploader:profiles(id, full_name)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      const rows = (data ?? []) as unknown as AttachmentRow[];
      if (cancelled) return;
      setAttachments(rows);
      setLoading(false);

      const entries = await Promise.all(
        rows.map(async (row) => {
          const { data: signed } = await supabase.storage
            .from("campaign-attachments")
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
        .channel(`campaign-attachments-${campaignId}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "campaign_attachments" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [campaignId]);

  async function handleUpload() {
    const files = Array.from(inputRef.current?.files ?? []);
    if (files.length === 0) {
      toast.error("Choose a file first");
      return;
    }

    if (files.length > MAX_CAMPAIGN_ATTACHMENTS) {
      toast.error(`Upload at most ${MAX_CAMPAIGN_ATTACHMENTS} files at a time`);
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
      const storagePath = `${campaignId}/${Date.now()}-${i}-${sanitizeStorageFilename(file.name)}`;

      const { error: uploadError } = await supabase.storage
        .from("campaign-attachments")
        .upload(storagePath, file);

      if (uploadError) {
        failed.push(file.name);
        continue;
      }

      const { error: insertError } = await supabase.from("campaign_attachments").insert({
        campaign_id: campaignId,
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
        action: "campaign_attachment_uploaded",
        summary: `Uploaded "${file.name}" to campaign "${campaignLabel}"`,
        entityType: "campaign",
        entityId: campaignId,
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
    await supabase.storage.from("campaign-attachments").remove([attachment.storage_path]);
    const { error } = await supabase.from("campaign_attachments").delete().eq("id", attachment.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    logActivity(supabase, {
      actorId: profile.id,
      action: "campaign_attachment_deleted",
      summary: `Removed "${attachment.file_name}" from campaign "${campaignLabel}"`,
      entityType: "campaign",
      entityId: campaignId,
    });
    toast.success("File removed");
  }

  return (
    <div className="space-y-3">
      <Label>Images &amp; posters</Label>

      <div className="flex flex-wrap items-end gap-2">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="block flex-1 text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
        />
        <Button type="button" size="sm" disabled={uploading} onClick={handleUpload}>
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Max 50MB per file, up to {MAX_CAMPAIGN_ATTACHMENTS} files at once.
      </p>

      {!loading && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No images or posters uploaded yet.</p>
      )}

      {attachments.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {attachments.map((a) => (
            <div key={a.id} className="space-y-1.5 rounded-md border p-2">
              {isImage(a.mime_type) && urls[a.id] ? (
                <a href={urls[a.id]} target="_blank" rel="noopener noreferrer" className="block">
                  <img
                    src={urls[a.id]}
                    alt={a.file_name}
                    className="aspect-square w-full rounded-md border object-cover"
                  />
                </a>
              ) : (
                <a
                  href={urls[a.id]}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex aspect-square w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground"
                >
                  {a.file_name.split(".").pop()?.toUpperCase() ?? "FILE"}
                </a>
              )}
              <p className="truncate text-xs" title={a.file_name}>
                {a.file_name}
              </p>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{formatBytes(a.file_size)}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => handleDelete(a)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
