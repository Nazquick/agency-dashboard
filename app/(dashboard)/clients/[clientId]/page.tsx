import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/session-user";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { formatDateTime } from "@/lib/format/datetime";
import { STATUS_BADGE_CLASS, statusLabel, contentTypeLabel, type TaskStatus } from "@/lib/tasks/constants";
import { mediaTypeLabel, platformLabel } from "@/lib/social-posts/constants";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FILE_TYPE_LABELS: Record<string, string> = {
  graphic_pack: "Graphic pack",
  onboarding: "Onboarding file",
  brand_guide: "Brand guide",
  other: "Other",
};

const DATE_TIME = { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" } as const;

function Section({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">{title}</CardTitle>
        {href && (
          <Link href={href} className="text-xs text-primary underline-offset-4 hover:underline">
            {linkLabel ?? "Open"}
          </Link>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export default async function ClientSummaryPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/");
  const isAdmin = isMasterKeyUser(user.email);
  const nowIso = new Date().toISOString();

  const [
    { data: client },
    { data: contacts },
    { data: files },
    { data: openTasks, count: openTaskCount },
    { data: campaigns },
    { data: posts },
    { data: events },
    { data: logins },
  ] = await Promise.all([
    supabase.from("clients").select("id, name, description, cover_image_path").eq("id", clientId).single(),
    supabase.from("client_contacts").select("*").eq("client_id", clientId).order("is_primary", { ascending: false }),
    supabase
      .from("client_files")
      .select("id, file_type, storage_path, file_name, created_at")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("tasks")
      .select("id, title, status, task_type, deadline, assignee:profiles!tasks_assignee_id_fkey(full_name)", {
        count: "exact",
      })
      .eq("client_id", clientId)
      .eq("archived", false)
      .neq("status", "done")
      .order("deadline", { ascending: true, nullsFirst: false })
      .limit(8),
    supabase
      .from("campaigns")
      .select("id, code, name, status, budget, ad_spend, roas, publication_date")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false })
      .limit(6),
    supabase
      .from("social_posts")
      .select("id, platform, media_type, caption, post_at")
      .eq("client_id", clientId)
      .gte("post_at", nowIso)
      .order("post_at", { ascending: true })
      .limit(6),
    supabase
      .from("calendar_events")
      .select("id, title, event_type, starts_at")
      .eq("client_id", clientId)
      .gte("starts_at", nowIso)
      .order("starts_at", { ascending: true })
      .limit(6),
    supabase.from("profiles").select("id, full_name, email").eq("role", "client").eq("client_id", clientId),
  ]);

  if (!client) notFound();

  const loginIds = (logins ?? []).map((l) => l.id);
  const [{ data: sessions }, { data: activity }] =
    isAdmin && loginIds.length > 0
      ? await Promise.all([
          supabase
            .from("user_sessions")
            .select("user_id, started_at, last_seen_at")
            .in("user_id", loginIds)
            .order("last_seen_at", { ascending: false })
            .limit(50),
          supabase
            .from("activity_log")
            .select("id, summary, created_at")
            .in("actor_id", loginIds)
            .order("created_at", { ascending: false })
            .limit(8),
        ])
      : [{ data: null }, { data: null }];

  const lastSeenByUser = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (!lastSeenByUser.has(s.user_id)) lastSeenByUser.set(s.user_id, s.last_seen_at);
  }

  const filesWithUrls = await Promise.all(
    (files ?? []).map(async (file) => {
      const { data } = await supabase.storage.from("client-assets").createSignedUrl(file.storage_path, 60 * 60);
      return { ...file, url: data?.signedUrl ?? null };
    })
  );

  const base = `/clients/${clientId}`;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Open tasks", value: openTaskCount ?? 0 },
          { label: "Campaigns", value: campaigns?.length ?? 0 },
          { label: "Upcoming posts", value: posts?.length ?? 0 },
          { label: "Upcoming events", value: events?.length ?? 0 },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Section title="Open tasks" href={`${base}/pipeline`} linkLabel="Pipeline">
          {openTasks?.length ? (
            <ul className="space-y-2">
              {openTasks.map((t) => {
                const assignee = t.assignee as unknown as { full_name: string } | null;
                return (
                  <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{t.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {[t.task_type ? contentTypeLabel(t.task_type) : null, assignee?.full_name, t.deadline ? formatDateTime(t.deadline, DATE_TIME) : null]
                          .filter(Boolean)
                          .join(" · ") || "No details"}
                      </p>
                    </div>
                    <Badge variant="secondary" className={STATUS_BADGE_CLASS[t.status as TaskStatus]}>
                      {statusLabel(t.status as TaskStatus)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Empty>No open tasks.</Empty>
          )}
        </Section>

        <Section title="Campaigns" href="/campaigns" linkLabel="All campaigns">
          {campaigns?.length ? (
            <ul className="space-y-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <Link href={`/campaigns/${c.id}`} className="flex items-start justify-between gap-3 text-sm hover:underline">
                    <span className="min-w-0 truncate">
                      <span className="font-mono text-xs text-muted-foreground">{c.code}</span> {c.name}
                    </span>
                    <Badge variant="secondary">{c.status}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No campaigns yet.</Empty>
          )}
        </Section>

        <Section title="Upcoming posts" href={`${base}/post-plan`} linkLabel="Post plan">
          {posts?.length ? (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li key={p.id} className="text-sm">
                  <p className="truncate font-medium">{p.caption || `${platformLabel(p.platform)} post`}</p>
                  <p className="text-xs text-muted-foreground">
                    {platformLabel(p.platform)} · {mediaTypeLabel(p.media_type)} · {formatDateTime(p.post_at, DATE_TIME)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Nothing scheduled.</Empty>
          )}
        </Section>

        <Section title="Upcoming calendar events" href={`${base}/calendar`} linkLabel="Calendar">
          {events?.length ? (
            <ul className="space-y-2">
              {events.map((e) => (
                <li key={e.id} className="text-sm">
                  <p className="truncate font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.event_type} · {formatDateTime(e.starts_at, DATE_TIME)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No upcoming events.</Empty>
          )}
        </Section>

        <Section title="Brand assets & files" href={`${base}/files`} linkLabel="All files">
          {filesWithUrls.length ? (
            <ul className="space-y-2">
              {filesWithUrls.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 text-sm">
                  {f.url ? (
                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="min-w-0 truncate text-primary underline underline-offset-4">
                      {f.file_name}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate">{f.file_name}</span>
                  )}
                  <Badge variant="outline">{FILE_TYPE_LABELS[f.file_type] ?? f.file_type}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No files uploaded yet.</Empty>
          )}
        </Section>

        <Section title="Contacts" href={`${base}/overview`} linkLabel="Manage">
          {contacts?.length ? (
            <ul className="space-y-2">
              {contacts.map((c) => (
                <li key={c.id} className="text-sm">
                  <p className="font-medium">
                    {c.name}
                    {c.is_primary && <span className="ml-2 text-xs font-normal text-muted-foreground">Primary</span>}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {[c.role, c.email, c.phone].filter(Boolean).join(" · ") || "No contact details"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>No contacts yet.</Empty>
          )}
        </Section>
      </div>

      <Section title="Portal activity">
        {logins?.length ? (
          <div className="space-y-4">
            <ul className="space-y-1.5">
              {logins.map((l) => (
                <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span>
                    {l.full_name} <span className="text-xs text-muted-foreground">{l.email}</span>
                  </span>
                  {isAdmin && (
                    <span className="text-xs text-muted-foreground">
                      {lastSeenByUser.has(l.id)
                        ? `Last seen ${formatDateTime(lastSeenByUser.get(l.id)!, DATE_TIME)}`
                        : "Never signed in"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {isAdmin ? (
              activity?.length ? (
                <ul className="space-y-1 border-t pt-3">
                  {activity.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 text-xs">
                      <span className="min-w-0 truncate">{a.summary}</span>
                      <span className="shrink-0 text-muted-foreground">{formatDateTime(a.created_at, DATE_TIME)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty>No recent actions from this client&apos;s logins.</Empty>
              )
            ) : (
              <Empty>Sign-in times and actions are visible to the admin only.</Empty>
            )}
          </div>
        ) : (
          <Empty>No portal logins for this client yet.</Empty>
        )}
      </Section>
    </div>
  );
}
