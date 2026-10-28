"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format/datetime";
import { mediaTypeHex, platformLabel } from "@/lib/social-posts/constants";
import { signedThumbnailUrls } from "@/lib/social-posts/thumbnail";
import type { ClientTheme } from "@/lib/social-posts/client-themes";
import type { PostWithRelations } from "@/components/social-posts/create-post-dialog";
import { cn } from "@/lib/utils";

const TILE_DATE = { month: "short", day: "numeric" } as const;

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function FeedTile({
  post,
  thumbnailUrl,
  scheduled,
}: {
  post: PostWithRelations;
  thumbnailUrl: string | undefined;
  scheduled: boolean;
}) {
  const hex = mediaTypeHex(post.media_type);
  const isVideo = post.media_type === "video" || post.post_type === "reel";
  const isCarousel = post.post_type === "carousel";
  return (
    <button
      type="button"
      className="group relative block aspect-square w-full overflow-hidden bg-muted text-left"
      aria-label={`${post.caption || platformLabel(post.platform)} — ${formatDate(post.post_at, TILE_DATE)}`}
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        <div
          className="flex size-full items-center justify-center p-2 text-center text-[11px] font-medium leading-snug sm:text-xs"
          style={{ backgroundColor: `${hex}22`, color: hex }}
        >
          <span className="line-clamp-5 break-words">{post.caption || platformLabel(post.platform)}</span>
        </div>
      )}

      {(isVideo || isCarousel) && (
        <span className="absolute right-1.5 top-1.5 text-white drop-shadow">
          {isCarousel ? <Layers className="size-4" /> : <Play className="size-4 fill-white" />}
        </span>
      )}
      {scheduled && (
        <span className="absolute left-1.5 top-1.5 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white">
          Scheduled
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent p-2 pt-6 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <p className="text-[11px] font-semibold">
          {formatDate(post.post_at, TILE_DATE)} · {platformLabel(post.platform)}
        </p>
        {post.caption && <p className="line-clamp-2 text-[11px] opacity-90">{post.caption}</p>}
      </div>
    </button>
  );
}

// One client's feed: a 3-column grid in posting order, newest post top-left,
// oldest at the bottom — what their profile will look like as posts go out.
export function PostFeed({
  posts,
  clientName,
  theme,
  needsClient,
  clients,
  onPickClient,
  renderPost,
  addPost,
}: {
  posts: PostWithRelations[];
  clientName?: string;
  theme: ClientTheme | null;
  // The team-wide page with "All clients" selected has no single feed to show.
  needsClient: boolean;
  clients: { id: string; name: string }[];
  onPickClient: (clientId: string) => void;
  renderPost: (post: PostWithRelations, tile: React.ReactNode) => React.ReactNode;
  addPost?: React.ReactNode;
}) {
  const [now] = useState(() => Date.now());
  const [urls, setUrls] = useState<Record<string, string>>({});

  const sorted = useMemo(
    () =>
      [...posts].sort(
        (a, b) =>
          new Date(b.post_at).getTime() - new Date(a.post_at).getTime() ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [posts]
  );

  const pathsKey = sorted
    .map((p) => p.thumbnail_path)
    .filter((p): p is string => Boolean(p))
    .join("|");

  useEffect(() => {
    let cancelled = false;
    const paths = pathsKey ? pathsKey.split("|") : [];
    signedThumbnailUrls(createClient(), paths).then((signed) => {
      if (!cancelled) setUrls(signed);
    });
    return () => {
      cancelled = true;
    };
  }, [pathsKey]);

  if (needsClient) {
    return (
      <div className="mx-auto max-w-xl space-y-4 rounded-lg border border-dashed bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Every client has their own feed. Choose one to see it.</p>
        <div className="flex flex-wrap justify-center gap-2">
          {clients.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPickClient(c.id)}
              className="rounded-full border px-3 py-1 text-sm hover:bg-muted"
            >
              {c.name.trim()}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const name = clientName?.trim() || "Feed";
  const accent = theme?.hex;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex size-12 items-center justify-center rounded-full text-lg font-semibold",
              !accent && "bg-primary text-primary-foreground"
            )}
            style={accent ? { backgroundColor: accent, color: theme?.onAccent } : undefined}
          >
            {initial(name)}
          </div>
          <div>
            <h2 className="text-base font-semibold leading-tight">{name}</h2>
            <p className="text-xs text-muted-foreground">
              {sorted.length} {sorted.length === 1 ? "post" : "posts"} · newest first
            </p>
          </div>
        </div>
        {addPost}
      </div>

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing planned for {name} yet. Posts you add to the plan appear here.
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-0.5 border-t-2 pt-0.5 sm:gap-1 sm:pt-1"
          style={accent ? { borderColor: accent } : undefined}
        >
          {sorted.map((post) => (
            <div key={post.id}>
              {renderPost(
                post,
                <FeedTile
                  post={post}
                  thumbnailUrl={post.thumbnail_path ? urls[post.thumbnail_path] : undefined}
                  scheduled={new Date(post.post_at).getTime() > now}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
