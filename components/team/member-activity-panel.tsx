"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser, useRoles } from "@/components/providers/user-provider";
import { isMasterKeyUser, roleLabel } from "@/lib/auth/roles";
import { activityLabel, formatDuration } from "@/lib/activity/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ONLINE_WINDOW_MS = 90_000;

export function MemberActivityPanel({
  members,
  initialSessions,
  initialActivity,
}: {
  members: Pick<Tables<"profiles">, "id" | "full_name" | "email" | "role">[];
  initialSessions: Tables<"user_sessions">[];
  initialActivity: Tables<"activity_log">[];
}) {
  const actor = useUser();
  const roles = useRoles();
  const [sessions, setSessions] = useState(initialSessions);
  const [activity, setActivity] = useState(initialActivity);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const isAdmin = isMasterKeyUser(actor.email);

  useEffect(() => {
    if (!isAdmin) return;
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const [{ data: sessionRows }, { data: activityRows }] = await Promise.all([
        supabase.from("user_sessions").select("*"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (sessionRows) setSessions(sessionRows);
      if (activityRows) setActivity(activityRows);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("member-activity-panel")
        .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const summaries = useMemo(() => {
    return members.map((member) => {
      const memberSessions = sessions.filter((s) => s.user_id === member.id);
      const logins = memberSessions.length;
      const totalSeconds = memberSessions.reduce((sum, s) => sum + s.active_seconds, 0);
      const lastSeenAt = memberSessions.reduce<string | null>((latest, s) => {
        if (!latest) return s.last_seen_at;
        return s.last_seen_at > latest ? s.last_seen_at : latest;
      }, null);
      const online = lastSeenAt ? now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS : false;
      return { member, logins, totalSeconds, lastSeenAt, online };
    });
  }, [members, sessions, now]);

  if (!isAdmin) {
    return null;
  }

  const viewingMember = members.find((m) => m.id === viewingMemberId) ?? null;
  const viewingActivity = activity.filter((a) => a.actor_id === viewingMemberId);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Logins, time in the app, and actions taken — visible only to you.
      </p>
      <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Logins</TableHead>
                <TableHead>Time spent</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ member, logins, totalSeconds, lastSeenAt, online }) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="font-medium">{member.full_name}</div>
                    <div className="text-xs text-muted-foreground">{roleLabel(member.role, roles)}</div>
                  </TableCell>
                  <TableCell>{logins}</TableCell>
                  <TableCell>{formatDuration(totalSeconds)}</TableCell>
                  <TableCell>
                    {lastSeenAt ? (
                      <span className="inline-flex items-center gap-1.5">
                        <span
                          className={`inline-block size-2 rounded-full ${online ? "bg-green-500" : "bg-muted-foreground/40"}`}
                          aria-hidden
                        />
                        {online
                          ? "Online now"
                          : `${formatDistanceToNow(new Date(lastSeenAt))} ago`}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Never logged in</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewingMemberId(member.id)}
                    >
                      View activity
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>

      <Dialog open={viewingMemberId !== null} onOpenChange={(open) => !open && setViewingMemberId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingMember?.full_name}&apos;s activity</DialogTitle>
          </DialogHeader>
          {viewingActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recorded actions yet.</p>
          ) : (
            <div className="space-y-2">
              {viewingActivity.map((entry) => (
                <div key={entry.id} className="rounded-md border p-2.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary">{activityLabel(entry.action)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(entry.created_at))} ago
                    </span>
                  </div>
                  <p className="mt-1 text-foreground">{entry.summary}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
