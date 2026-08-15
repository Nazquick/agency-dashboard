"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser, useGroups } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import { PLATFORMS, MEDIA_TYPES, POST_TYPES, platformLabel } from "@/lib/social-posts/constants";
import { PostAttachments } from "@/components/social-posts/post-attachments";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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

const postSchema = z.object({
  platform: z.string().min(1, "Choose a platform"),
  media_type: z.string().min(1, "Choose a media type"),
  post_type: z.string().min(1, "Choose a post type"),
  caption: z.string().optional(),
  tag_handles: z.string().optional(),
  suggested_song: z.string().optional(),
  post_at: z.string().min(1, "Choose a date and time"),
  client_id: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

export type PostWithRelations = Tables<"social_posts"> & {
  client: { id: string; name: string } | null;
  credits: { id: string; full_name: string }[];
};

function toDatetimeLocal(value: string | Date | null): string {
  if (!value) return "";
  const d = typeof value === "string" ? new Date(value) : value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreatePostDialog({
  post,
  profiles,
  clients,
  defaultDate,
  trigger,
  onSuccess,
  onDelete,
}: {
  post?: PostWithRelations;
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_external">[];
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
  defaultDate?: Date;
  trigger: React.ReactNode;
  onSuccess?: (post: Tables<"social_posts">, creditIds: string[]) => void;
  onDelete?: (id: string) => void;
}) {
  const profile = useUser();
  const groups = useGroups();
  const [open, setOpen] = useState(false);
  const [creditIds, setCreditIds] = useState<string[]>(() => post?.credits.map((c) => c.id) ?? []);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      platform: "instagram",
      media_type: "video",
      post_type: "post",
      caption: "",
      tag_handles: "",
      suggested_song: "",
      post_at: "",
      client_id: NONE,
    },
  });

  // Reset the form here (an event handler triggered by Dialog's own
  // trigger-click/close interactions) rather than in a useEffect keyed on
  // `open` — that would call setState synchronously inside an effect body.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    if (post) {
      reset({
        platform: post.platform,
        media_type: post.media_type,
        post_type: post.post_type,
        caption: post.caption ?? "",
        tag_handles: post.tag_handles ?? "",
        suggested_song: post.suggested_song ?? "",
        post_at: toDatetimeLocal(post.post_at),
        client_id: post.client_id ?? NONE,
      });
      setCreditIds(post.credits.map((c) => c.id));
    } else {
      reset({
        platform: "instagram",
        media_type: "video",
        post_type: "post",
        caption: "",
        tag_handles: "",
        suggested_song: "",
        post_at: defaultDate ? toDatetimeLocal(defaultDate) : "",
        client_id: NONE,
      });
      setCreditIds([]);
    }
  }

  async function onSubmit(values: PostFormValues) {
    setSaving(true);
    const supabase = createClient();
    const postAtIso = new Date(values.post_at).toISOString();

    const payload = {
      platform: values.platform,
      media_type: values.media_type,
      post_type: values.post_type,
      caption: values.caption || null,
      tag_handles: values.tag_handles || null,
      suggested_song: values.suggested_song || null,
      post_at: postAtIso,
      client_id: values.client_id && values.client_id !== NONE ? values.client_id : null,
    };

    const { data, error } = post
      ? await supabase.from("social_posts").update(payload).eq("id", post.id).select().single()
      : await supabase
          .from("social_posts")
          .insert({ ...payload, created_by: profile.id })
          .select()
          .single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Failed to save post");
      return;
    }

    await supabase.from("social_post_credits").delete().eq("post_id", data.id);
    if (creditIds.length > 0) {
      const { error: creditError } = await supabase
        .from("social_post_credits")
        .insert(creditIds.map((profileId) => ({ post_id: data.id, profile_id: profileId })));
      if (creditError) toast.error(`Credits not saved: ${creditError.message}`);
    }

    setSaving(false);
    toast.success(post ? "Post updated" : "Post added to the plan");
    logActivity(supabase, {
      actorId: profile.id,
      action: post ? "post_plan_updated" : "post_plan_created",
      summary: post
        ? `Updated post "${values.caption || values.platform}"`
        : `Added post "${values.caption || values.platform}" to the plan`,
      entityType: "social_post",
      entityId: data.id,
    });
    onSuccess?.(data, creditIds);
    setOpen(false);
  }

  async function handleDelete() {
    if (!post) return;
    if (!window.confirm("Delete this post from the plan?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("social_posts").delete().eq("id", post.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Post deleted");
    logActivity(supabase, {
      actorId: profile.id,
      action: "post_plan_deleted",
      summary: `Deleted post "${post.caption || post.platform}"`,
      entityType: "social_post",
      entityId: post.id,
    });
    onDelete?.(post.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{post ? "Edit post" : "New post"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Platform</Label>
              <Controller
                name="platform"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATFORMS.map((p) => (
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
              <Label>Media type</Label>
              <Controller
                name="media_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MEDIA_TYPES.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>Post type</Label>
              <Controller
                name="post_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {POST_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Client</Label>
            <Controller
              name="client_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? NONE} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="No client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No client (internal)</SelectItem>
                    {groups
                      .filter((g) => clients.some((c) => c.group_id === g.id) && g.all_client_id)
                      .map((g) => (
                        <SelectItem key={g.id} value={g.all_client_id as string}>
                          {g.name} (ALL)
                        </SelectItem>
                      ))}
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

          <div className="space-y-2">
            <Label htmlFor="post-caption">Title / caption</Label>
            <Textarea id="post-caption" rows={3} {...register("caption")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-tags">Tag</Label>
            <Input id="post-tags" placeholder="@handle1, @handle2" {...register("tag_handles")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-song">Suggested song</Label>
            <Input id="post-song" placeholder="Artist – Track" {...register("suggested_song")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="post-time">Time to post</Label>
            <Input id="post-time" type="datetime-local" {...register("post_at")} />
            {errors.post_at && <p className="text-sm text-destructive">{errors.post_at.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Credit</Label>
            <div className="max-h-32 space-y-1 overflow-y-auto rounded-md border p-2">
              {profiles.map((p) => (
                <label key={p.id} className="flex items-center gap-2 py-0.5 text-sm">
                  <Checkbox
                    checked={creditIds.includes(p.id)}
                    onCheckedChange={(checked) =>
                      setCreditIds((prev) =>
                        checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)
                      )
                    }
                  />
                  {p.full_name}
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            {post ? (
              <Button type="button" variant="ghost" onClick={handleDelete}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : post ? "Save changes" : "Add to plan"}
            </Button>
          </div>

          {post && <PostAttachments postId={post.id} postLabel={post.caption || platformLabel(post.platform)} />}
        </form>
      </DialogContent>
    </Dialog>
  );
}
