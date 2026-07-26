"use client";

import { useEffect, useMemo, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser } from "@/lib/auth/roles";
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

type ClientLoginProfile = Pick<Tables<"profiles">, "id" | "full_name" | "client_id">;

export function ClientActivityPanel({
  clients,
  initialLoginProfiles,
  initialSessions,
  initialActivity,
}: {
  clients: Pick<Tables<"clients">, "id" | "name">[];
  initialLoginProfiles: ClientLoginProfile[];
  initialSessions: Tables<"user_sessions">[];
  initialActivity: Tables<"activity_log">[];
}) {
  const actor = useUser();
  const [loginProfiles, setLoginProfiles] = useState(initialLoginProfiles);
  const [sessions, setSessions] = useState(initialSessions);
  const [activity, setActivity] = useState(initialActivity);
  const [viewingClientId, setViewingClientId] = useState<string | null>(null);
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
      const [{ data: profileRows }, { data: sessionRows }, { data: activityRows }] = await Promise.all([
        supabase.from("profiles").select("id, full_name, client_id").eq("role", "client"),
        supabase.from("user_sessions").select("*"),
        supabase.from("activity_log").select("*").order("created_at", { ascending: false }).limit(500),
      ]);
      if (profileRows) setLoginProfiles(profileRows);
      if (sessionRows) setSessions(sessionRows);
      if (activityRows) setActivity(activityRows);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("client-activity-panel")
        .on("postgres_changes", { event: "*", schema: "public", table: "user_sessions" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "activity_log" }, refetch)
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const summaries = useMemo(() => {
    return clients.map((client) => {
      const clientProfiles = loginProfiles.filter((p) => p.client_id === client.id);
      const profileIds = new Set(clientProfiles.map((p) => p.id));
      const clientSessions = sessions.filter((s) => profileIds.has(s.user_id));
      const logins = clientSessions.length;
      const totalSeconds = clientSessions.reduce((sum, s) => sum + s.active_seconds, 0);
      const lastSeenAt = clientSessions.reduce<string | null>((latest, s) => {
        if (!latest) return s.last_seen_at;
        return s.last_seen_at > latest ? s.last_seen_at : latest;
      }, null);
      const online = lastSeenAt ? now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS : false;
      return {
        client,
        hasLogin: clientProfiles.length > 0,
        logins,
        totalSeconds,
        lastSeenAt,
        online,
        profileIds,
      };
    });
  }, [clients, loginProfiles, sessions, now]);

  if (!isAdmin) {
    return null;
  }

  const viewingSummary = summaries.find((s) => s.client.id === viewingClientId) ?? null;
  const viewingActivity = viewingSummary
    ? activity.filter((a) => viewingSummary.profileIds.has(a.actor_id))
    : [];

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Portal logins, time spent, and actions taken per client.
      </p>
      <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Logins</TableHead>
                <TableHead>Time spent</TableHead>
                <TableHead>Last active</TableHead>
                <TableHead className="text-right">Activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaries.map(({ client, hasLogin, logins, totalSeconds, lastSeenAt, online }) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  {hasLogin ? (
                    <>
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
                          onClick={() => setViewingClientId(client.id)}
                        >
                          View activity
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <TableCell colSpan={4} className="text-muted-foreground">
                      <Badge variant="outline">No portal login yet</Badge>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
      </div>

      <Dialog open={viewingClientId !== null} onOpenChange={(open) => !open && setViewingClientId(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewingSummary?.client.name}&apos;s activity</DialogTitle>
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
