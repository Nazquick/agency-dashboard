"use client";

import { useState } from "react";
import { mediaTypeBadgeClass, mediaTypeLabel, platformLabel, postTypeLabel } from "@/lib/social-posts/constants";
import { PostAttachments } from "@/components/social-posts/post-attachments";
import type { PostWithRelations } from "@/components/social-posts/create-post-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatPostAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// Read-only counterpart to CreatePostDialog — used wherever a viewer can
// see a post but never edit it (the client portal). No form, no mutations.
export function PostViewDialog({ post, trigger }: { post: PostWithRelations; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{post.caption || platformLabel(post.platform)}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{platformLabel(post.platform)}</Badge>
            <Badge variant="secondary">{postTypeLabel(post.post_type)}</Badge>
            <Badge className={mediaTypeBadgeClass(post.media_type)}>{mediaTypeLabel(post.media_type)}</Badge>
          </div>

          {post.caption && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Title / caption</p>
              <p className="whitespace-pre-wrap text-sm">{post.caption}</p>
            </div>
          )}

          {post.tag_handles && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Tag</p>
              <p className="text-sm">{post.tag_handles}</p>
            </div>
          )}

          {post.suggested_song && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Suggested song</p>
              <p className="text-sm">{post.suggested_song}</p>
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Time to post</p>
            <p className="text-sm">{formatPostAt(post.post_at)}</p>
          </div>

          {post.credits.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Credit</p>
              <p className="text-sm">{post.credits.map((c) => c.full_name).join(", ")}</p>
            </div>
          )}

          <PostAttachments postId={post.id} postLabel={post.caption || platformLabel(post.platform)} readOnly />
        </div>
      </DialogContent>
    </Dialog>
  );
}
