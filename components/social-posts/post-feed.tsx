"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Layers, Play } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format/datetime";
import { mediaTypeHex, platformLabel } from "@/lib/social-posts/constants";
import { signedThumbnailUrls } from "@/lib/social-posts/thumbnail";
import { cropFromPost, type ThumbnailCrop } from "@/lib/social-posts/crop";
import { downloadBlob, renderFeedGrid } from "@/lib/social-posts/export-grid";
import { CropFrame } from "@/components/social-posts/crop-frame";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ClientTheme } from "@/lib/social-posts/client-themes";
import type { PostWithRelations } from "@/components/social-posts/create-post-dialog";
import { cn } from "@/lib/utils";

const TILE_DATE = { month: "short", day: "numeric" } as const;
const ALL_MONTHS = "all";
// One page of the feed: 3 columns x 6 rows, sized to fit on screen at once.
const PAGE_SIZE = 16;
// The square tiles make the grid's height twice its width (6 rows, 3 columns),
// so the width is capped to leave room for the controls above it.
const FEED_MAX_WIDTH = "clamp(18rem, calc((100dvh - 22rem) / 2), 42rem)";

function monthKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return formatDate(new Date(year, month - 1, 15), {
    month: "long",
    year: "numeric",
  });
}

function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function FeedTile({
  post,
  thumbnailUrl,
  crop,
  scheduled,
}: {
  post: PostWithRelations;
  thumbnailUrl: string | undefined;
  crop: ThumbnailCrop;
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
        <CropFrame src={thumbnailUrl} crop={crop} className="absolute inset-0" />
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

// Adjust-crop mode: the picture itself is draggable and zoomable in place,
// next to its neighbours, so the grid as a whole can be composed.
function AdjustTile({
  post,
  thumbnailUrl,
  crop,
  scheduled,
  onChange,
}: {
  post: PostWithRelations;
  thumbnailUrl: string | undefined;
  crop: ThumbnailCrop;
  scheduled: boolean;
  onChange: (crop: ThumbnailCrop) => void;
}) {
  if (!thumbnailUrl) {
    return (
      <div className="relative opacity-60">
        <FeedTile post={post} thumbnailUrl={undefined} crop={crop} scheduled={scheduled} />
      </div>
    );
  }
  return (
    <div className="relative aspect-square ring-2 ring-primary/50">
      <CropFrame
        src={thumbnailUrl}
        crop={crop}
        onChange={onChange}
        controls="buttons"
        className="absolute inset-0"
      />
    </div>
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
  canAdjust = false,
  onSaveCrop,
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
  // Team only: lets the thumbnails be dragged/zoomed in place.
  canAdjust?: boolean;
  onSaveCrop?: (postId: string, crop: ThumbnailCrop) => Promise<boolean>;
}) {
  const [now] = useState(() => Date.now());
  const [adjusting, setAdjusting] = useState(false);
  const [month, setMonth] = useState(ALL_MONTHS);
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  // Crops being edited right now; shown immediately, then saved shortly after
  // the user stops moving so a drag isn't one network call per pixel.
  const [overrides, setOverrides] = useState<Record<string, ThumbnailCrop>>({});
  const pending = useRef<Record<string, ThumbnailCrop>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const saveRef = useRef(onSaveCrop);
  useEffect(() => {
    saveRef.current = onSaveCrop;
  });

  useEffect(() => {
    const queued = pending.current;
    const waiting = timers.current;
    return () => {
      // Leaving the tab mid-edit must not lose the last adjustment.
      Object.values(waiting).forEach(clearTimeout);
      Object.entries(queued).forEach(([id, crop]) => void saveRef.current?.(id, crop));
    };
  }, []);

  async function persist(postId: string) {
    const crop = pending.current[postId];
    if (!crop) return;
    delete pending.current[postId];
    clearTimeout(timers.current[postId]);
    const ok = await saveRef.current?.(postId, crop);
    if (ok && !pending.current[postId]) {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[postId];
        return next;
      });
    }
  }

  function handleCropChange(postId: string, crop: ThumbnailCrop) {
    setOverrides((prev) => ({ ...prev, [postId]: crop }));
    pending.current[postId] = crop;
    clearTimeout(timers.current[postId]);
    timers.current[postId] = setTimeout(() => void persist(postId), 700);
  }

  function toggleAdjusting() {
    if (adjusting) Object.keys(pending.current).forEach((id) => void persist(id));
    setAdjusting((v) => !v);
  }
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

  const hasThumbnails = sorted.some((p) => p.thumbnail_path);

  // Months that have at least one post, newest first. A month that no longer
  // has posts (another client picked, post deleted) falls back to all months.
  const monthKeys = useMemo(() => [...new Set(sorted.map((p) => monthKey(p.post_at)))], [sorted]);
  const activeMonth = month !== ALL_MONTHS && monthKeys.includes(month) ? month : ALL_MONTHS;
  const inMonth = useMemo(
    () => (activeMonth === ALL_MONTHS ? sorted : sorted.filter((p) => monthKey(p.post_at) === activeMonth)),
    [sorted, activeMonth]
  );
  const pageCount = Math.max(1, Math.ceil(inMonth.length / PAGE_SIZE));
  const activePage = Math.min(page, pageCount - 1);
  const shown = inMonth.slice(activePage * PAGE_SIZE, (activePage + 1) * PAGE_SIZE);

  // Saves the whole selection (the chosen month, every page of it) as one image.
  async function exportGrid() {
    setExporting(true);
    try {
      const blob = await renderFeedGrid(
        inMonth.map((post) => ({
          imageUrl: post.thumbnail_path ? urls[post.thumbnail_path] : undefined,
          crop: overrides[post.id] ?? cropFromPost(post),
          caption: post.caption || platformLabel(post.platform),
          hex: mediaTypeHex(post.media_type),
        }))
      );
      const slug = (clientName ?? "feed")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      downloadBlob(blob, `${slug || "feed"}-grid-${activeMonth === ALL_MONTHS ? "all" : activeMonth}.png`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not export the grid.");
    } finally {
      setExporting(false);
    }
  }

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
        <p className="text-sm text-muted-foreground">
          Every client has their own feed. Choose one to see it.
        </p>
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
    <div className="mx-auto space-y-4" style={{ maxWidth: FEED_MAX_WIDTH }}>
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
              {inMonth.length} {inMonth.length === 1 ? "post" : "posts"}
              {activeMonth !== ALL_MONTHS && ` in ${monthLabel(activeMonth)}`} · newest first
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canAdjust && hasThumbnails && (
            <Button
              type="button"
              size="sm"
              variant={adjusting ? "default" : "outline"}
              onClick={toggleAdjusting}
            >
              {adjusting ? "Done" : "Adjust crop"}
            </Button>
          )}
          {addPost}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={activeMonth}
            onValueChange={(value) => {
              setMonth(value);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-48" aria-label="Show posts from month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_MONTHS}>All months</SelectItem>
              {monthKeys.map((key) => (
                <SelectItem key={key} value={key}>
                  {monthLabel(key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" size="sm" variant="outline" onClick={exportGrid} disabled={exporting}>
            <Download className="size-4" /> {exporting ? "Preparing…" : "Download grid"}
          </Button>
        </div>
      )}

      {adjusting && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          Drag a photo to move it, scroll or use + / − to zoom. Changes save automatically. Double-click a
          post to open it.
        </p>
      )}
      {!adjusting && shown.length > 0 && (
        <p className="text-xs text-muted-foreground">Double-click a post to open it.</p>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          Nothing planned for {name} yet. Posts you add to the plan appear here.
        </div>
      ) : (
        <div
          className="grid grid-cols-3 gap-0.5 border-t-2 pt-0.5 sm:gap-1 sm:pt-1"
          style={accent ? { borderColor: accent } : undefined}
        >
          {shown.map((post) => {
            const thumbnailUrl = post.thumbnail_path ? urls[post.thumbnail_path] : undefined;
            const crop = overrides[post.id] ?? cropFromPost(post);
            const scheduled = new Date(post.post_at).getTime() > now;
            return (
              <div key={post.id}>
                {renderPost(
                  post,
                  adjusting ? (
                    <AdjustTile
                      post={post}
                      thumbnailUrl={thumbnailUrl}
                      crop={crop}
                      scheduled={scheduled}
                      onChange={(next) => handleCropChange(post.id, next)}
                    />
                  ) : (
                    <FeedTile post={post} thumbnailUrl={thumbnailUrl} crop={crop} scheduled={scheduled} />
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activePage === 0}
            onClick={() => setPage(activePage - 1)}
          >
            Newer
          </Button>
          <span>
            {activePage * PAGE_SIZE + 1}–{activePage * PAGE_SIZE + shown.length} of {inMonth.length}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={activePage >= pageCount - 1}
            onClick={() => setPage(activePage + 1)}
          >
            Older
          </Button>
        </div>
      )}
    </div>
  );
}
