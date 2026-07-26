"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const HEARTBEAT_MS = 30_000;
const STORAGE_KEY = "dyor_session_id";

// Renders nothing — just keeps user_sessions.active_seconds/last_seen_at
// current for the admin activity panel while this tab is in the
// foreground. The session row itself is created at login (app/login/page.tsx);
// this only creates a fallback row if that's missing (e.g. a cookie-persisted
// session opened a fresh tab without going through /login).
export function SessionHeartbeat({ userId }: { userId: string }) {
  const activeSeconds = useRef(0);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let interval: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    async function ensureSession() {
      const existing = sessionStorage.getItem(STORAGE_KEY);
      if (existing) {
        // Reusing a session across a reload — seed the local counter from
        // the DB so the next tick increments instead of clobbering it.
        const { data } = await supabase
          .from("user_sessions")
          .select("active_seconds")
          .eq("id", existing)
          .single();
        if (cancelled) return;
        sessionId.current = existing;
        activeSeconds.current = data?.active_seconds ?? 0;
        return;
      }
      const { data } = await supabase
        .from("user_sessions")
        .insert({ user_id: userId })
        .select("id")
        .single();
      if (cancelled) return;
      if (data) {
        sessionId.current = data.id;
        sessionStorage.setItem(STORAGE_KEY, data.id);
      }
    }

    async function tick() {
      if (!sessionId.current) return;
      activeSeconds.current += HEARTBEAT_MS / 1000;
      await supabase
        .from("user_sessions")
        .update({
          active_seconds: activeSeconds.current,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", sessionId.current);
    }

    function start() {
      if (interval) return;
      interval = setInterval(tick, HEARTBEAT_MS);
    }

    function stop() {
      if (!interval) return;
      clearInterval(interval);
      interval = null;
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }

    ensureSession().then(() => {
      if (cancelled) return;
      if (document.visibilityState === "visible") start();
      document.addEventListener("visibilitychange", handleVisibility);
    });

    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId]);

  return null;
}
