"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { MEDIA_TYPES, mediaTypeHex, mediaTypeLabel, platformLabel } from "@/lib/social-posts/constants";
import { flattenPostCredits } from "@/lib/social-posts/flatten";
import { CreatePostDialog, type PostWithRelations } from "@/components/social-posts/create-post-dialog";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// A 6x7 grid covering the whole month, Monday-start, including the
// leading/trailing days from adjacent months needed to fill the grid.
function buildGrid(month: Date): Date[] {
  const first = startOfMonth(month);
  const firstWeekday = (first.getDay() + 6) % 7; // 0 = Monday
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function PostPlanCalendar({
  initialPosts,
  profiles,
}: {
  initialPosts: PostWithRelations[];
  profiles: Pick<Tables<"profiles">, "id" | "full_name" | "role" | "is_external">[];
}) {
  const [posts, setPosts] = useState(initialPosts);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("social_posts")
        .select("*, social_post_credits(profile:profiles(id, full_name))")
        .order("post_at");
      if (!data || cancelled) return;
      setPosts(flattenPostCredits(data as unknown as Parameters<typeof flattenPostCredits>[0]));
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("post-plan-calendar")
        .on("postgres_changes", { event: "*", schema: "public", table: "social_posts" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "social_post_credits" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const grid = useMemo(() => buildGrid(month), [month]);

  const postsByDay = useMemo(() => {
    const map = new Map<string, PostWithRelations[]>();
    for (const p of posts) {
      const key = new Date(p.post_at).toDateString();
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.post_at).getTime() - new Date(b.post_at).getTime());
    }
    return map;
  }, [posts]);

  function mergeUpdatedPost(updated: Tables<"social_posts">, creditIds: string[]) {
    const credits = creditIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is NonNullable<typeof p> => p !== undefined)
      .map((p) => ({ id: p.id, full_name: p.full_name }));
    setPosts((prev) => {
      const next = { ...updated, credits } as PostWithRelations;
      const exists = prev.some((p) => p.id === updated.id);
      return exists ? prev.map((p) => (p.id === updated.id ? next : p)) : [...prev, next];
    });
  }

  const today = new Date();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="min-w-[10rem] text-center text-lg font-semibold">
            {month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <Button variant="outline" size="icon-sm" onClick={() => setMonth((m) => addMonths(m, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {MEDIA_TYPES.map((m) => (
            <span key={m.value} className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: m.hex }} />
              {m.label}
            </span>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        <div className="grid grid-cols-7 border-b bg-muted/40 text-xs font-medium text-muted-foreground">
          {WEEKDAYS.map((w) => (
            <div key={w} className="px-2 py-2 text-center">
              {w}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {grid.map((day, i) => {
            const inMonth = day.getMonth() === month.getMonth();
            const dayPosts = postsByDay.get(day.toDateString()) ?? [];
            const isToday = isSameDay(day, today);
            return (
              <div
                key={i}
                className={cn(
                  "min-h-28 border-b border-r p-1.5",
                  !inMonth && "bg-muted/20 text-muted-foreground",
                  (i + 1) % 7 === 0 && "border-r-0"
                )}
              >
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                  <CreatePostDialog
                    profiles={profiles}
                    defaultDate={new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12, 0)}
                    trigger={
                      <button
                        type="button"
                        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                        title="Add post"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    }
                    onSuccess={mergeUpdatedPost}
                  />
                </div>
                <div className="space-y-1">
                  {dayPosts.map((p) => (
                    <CreatePostDialog
                      key={p.id}
                      post={p}
                      profiles={profiles}
                      trigger={
                        <button
                          type="button"
                          className="block w-full truncate rounded px-1.5 py-0.5 text-left text-xs font-medium"
                          style={{
                            backgroundColor: `${mediaTypeHex(p.media_type)}22`,
                            color: mediaTypeHex(p.media_type),
                          }}
                          title={`${platformLabel(p.platform)} · ${mediaTypeLabel(p.media_type)}${p.caption ? ` — ${p.caption}` : ""}`}
                        >
                          {new Date(p.post_at).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}{" "}
                          {p.caption || platformLabel(p.platform)}
                        </button>
                      }
                      onSuccess={mergeUpdatedPost}
                      onDelete={(id) => setPosts((prev) => prev.filter((post) => post.id !== id))}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
