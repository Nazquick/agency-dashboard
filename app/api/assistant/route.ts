import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser, roleLabel } from "@/lib/auth/roles";
import { channelLabel } from "@/lib/campaigns/constants";

const INVOLVEMENT_WINDOW_DAYS = 180;
const MAX_TURNS = 5;
const SNAPSHOT_ROW_LIMIT = 300;

type ChatMessage = { role: "user" | "assistant"; content: string };

const DASHBOARD_SNAPSHOT_TOOL = {
  name: "get_dashboard_snapshot",
  description:
    "Fetch a live snapshot of the whole dashboard right now — every non-archived task with its status/priority/deadline/assignee/client, every campaign (never budget/ad spend/ROAS), upcoming calendar events, the active client list, open bounties, and upcoming/recent Post Plan posts. Always call this first, on every question, so your answer reflects the current state rather than anything you remember from earlier in the conversation.",
  input_schema: { type: "object" as const, properties: {} },
};

const GET_CAMPAIGN_TEAM_TOOL = {
  name: "get_campaign_team",
  description:
    "Look up who created a specific campaign (by its code) and who else has recently worked on tasks or social posts for that same client — useful for suggesting who to loop in. Only call this when the question is actually about who's involved or who to contact.",
  input_schema: {
    type: "object" as const,
    properties: {
      code: { type: "string", description: "The campaign's code, e.g. CMP-00001" },
    },
    required: ["code"],
  },
};

const REMEMBER_FACT_TOOL = {
  name: "remember_fact",
  description:
    "Save a standing fact, preference, correction, or instruction the admin just told you, so every future conversation with any team member can use it. Only call this while talking to the admin. Err on the side of remembering — call it whenever the admin states something worth keeping, even if they didn't explicitly say 'remember this.' Don't call it for one-off questions that don't teach you anything new.",
  input_schema: {
    type: "object" as const,
    properties: {
      content: { type: "string", description: "The fact or instruction, written as a standalone statement." },
    },
    required: ["content"],
  },
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, email")
    .eq("id", userId)
    .single();
  if (!profile || profile.role === "client") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "The assistant isn't configured yet — ANTHROPIC_API_KEY is missing." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { question, history } = body as { question?: string; history?: ChatMessage[] };
  if (!question) {
    return NextResponse.json({ error: "question is required" }, { status: 400 });
  }

  const isAdmin = isMasterKeyUser(profile.email);

  const [{ data: roles }, { data: knowledge }] = await Promise.all([
    supabase.from("roles").select("value, label"),
    supabase.from("assistant_knowledge").select("content").order("created_at", { ascending: true }).limit(150),
  ]);
  const roleOptions = roles ?? [];
  const requesterRoleLabel = roleLabel(profile.role, roleOptions);

  async function getDashboardSnapshot() {
    const nowIso = new Date().toISOString();
    const postsWindowStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      { data: tasks, count: taskCount },
      { data: campaigns },
      { data: events },
      { data: clients },
      { data: bounties },
      { data: posts },
    ] = await Promise.all([
      supabase
        .from("tasks")
        .select("title, status, priority, deadline, client:clients(name), assignee:profiles(full_name, role)", {
          count: "exact",
        })
        .eq("archived", false)
        .eq("is_special", false)
        .order("deadline", { ascending: true, nullsFirst: false })
        .limit(SNAPSHOT_ROW_LIMIT),
      supabase
        .from("campaigns")
        .select("code, name, status, distribution_channels, publication_date, client:clients(name)")
        .order("publication_date", { ascending: false, nullsFirst: false })
        .limit(SNAPSHOT_ROW_LIMIT),
      supabase
        .from("calendar_events")
        .select("title, event_type, starts_at, ends_at, client:clients(name), assignee:profiles(full_name, role)")
        .gte("starts_at", nowIso)
        .order("starts_at", { ascending: true })
        .limit(SNAPSHOT_ROW_LIMIT),
      supabase.from("clients").select("name").eq("archived", false).eq("is_group_all", false).order("name"),
      supabase
        .from("tasks")
        .select("title, deadline, payout_amount")
        .eq("is_special", true)
        .neq("status", "done")
        .eq("archived", false)
        .order("deadline", { ascending: true, nullsFirst: false }),
      supabase
        .from("social_posts")
        .select("caption, platform, media_type, post_type, post_at, client:clients(name)")
        .gte("post_at", postsWindowStart)
        .order("post_at", { ascending: true })
        .limit(SNAPSHOT_ROW_LIMIT),
    ]);

    const taskRows = tasks ?? [];
    const statusCounts: Record<string, number> = {};
    for (const t of taskRows) statusCounts[t.status] = (statusCounts[t.status] ?? 0) + 1;

    return {
      generated_at: nowIso,
      tasks: {
        total: taskCount ?? taskRows.length,
        status_breakdown: statusCounts,
        showing: taskRows.length,
        items: taskRows.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          deadline: t.deadline,
          client: (t.client as unknown as { name: string } | null)?.name ?? null,
          assignee: t.assignee
            ? {
                name: (t.assignee as unknown as { full_name: string; role: string }).full_name,
                role: roleLabel((t.assignee as unknown as { full_name: string; role: string }).role, roleOptions),
              }
            : null,
        })),
      },
      campaigns: (campaigns ?? []).map((c) => ({
        code: c.code,
        name: c.name,
        client: (c.client as unknown as { name: string } | null)?.name ?? null,
        status: c.status,
        channels: c.distribution_channels.map(channelLabel),
        publication_date: c.publication_date,
      })),
      upcoming_events: (events ?? []).map((e) => ({
        title: e.title,
        type: e.event_type,
        starts_at: e.starts_at,
        ends_at: e.ends_at,
        client: (e.client as unknown as { name: string } | null)?.name ?? null,
        assignee: e.assignee
          ? {
              name: (e.assignee as unknown as { full_name: string; role: string }).full_name,
              role: roleLabel((e.assignee as unknown as { full_name: string; role: string }).role, roleOptions),
            }
          : null,
      })),
      active_clients: (clients ?? []).map((c) => c.name),
      open_bounties: (bounties ?? []).map((b) => ({
        title: b.title,
        deadline: b.deadline,
        payout: b.payout_amount,
      })),
      upcoming_and_recent_posts: (posts ?? []).map((p) => ({
        client: (p.client as unknown as { name: string } | null)?.name ?? null,
        platform: p.platform,
        media_type: p.media_type,
        post_type: p.post_type,
        caption: p.caption,
        post_at: p.post_at,
      })),
    };
  }

  async function getCampaignTeam(code: string) {
    const { data: campaign } = await supabase
      .from("campaigns")
      .select("name, client_id, creator:profiles(full_name, role)")
      .eq("code", code)
      .maybeSingle();

    if (!campaign) {
      return { error: `No campaign found with code "${code}"` };
    }

    const cutoff = new Date(Date.now() - INVOLVEMENT_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: taskPeople }, { data: postPeople }] = await Promise.all([
      supabase
        .from("task_assignees")
        .select("profile:profiles(id, full_name, role), tasks!inner(client_id, created_at)")
        .eq("tasks.client_id", campaign.client_id)
        .gte("tasks.created_at", cutoff),
      supabase
        .from("social_post_credits")
        .select("profile:profiles(id, full_name, role), social_posts!inner(client_id, created_at)")
        .eq("social_posts.client_id", campaign.client_id)
        .gte("social_posts.created_at", cutoff),
    ]);

    const counts = new Map<string, { name: string; role: string; recent_activity_count: number }>();
    function bump(p: { id: string; full_name: string; role: string } | null) {
      if (!p) return;
      const existing = counts.get(p.id);
      if (existing) existing.recent_activity_count++;
      else counts.set(p.id, { name: p.full_name, role: roleLabel(p.role, roleOptions), recent_activity_count: 1 });
    }
    (taskPeople ?? []).forEach((row) => bump(row.profile as unknown as { id: string; full_name: string; role: string } | null));
    (postPeople ?? []).forEach((row) => bump(row.profile as unknown as { id: string; full_name: string; role: string } | null));

    const recentlyInvolved = Array.from(counts.values())
      .sort((a, b) => b.recent_activity_count - a.recent_activity_count)
      .slice(0, 5);

    const creator = campaign.creator as unknown as { full_name: string; role: string } | null;

    return {
      campaign_name: campaign.name,
      created_by: creator ? { name: creator.full_name, role: roleLabel(creator.role, roleOptions) } : null,
      recently_involved: recentlyInvolved,
    };
  }

  async function rememberFact(content: string) {
    if (!isAdmin || !content?.trim()) {
      return { saved: false };
    }
    const { error } = await supabase
      .from("assistant_knowledge")
      .insert({ content: content.trim(), created_by: userId });
    return { saved: !error };
  }

  async function executeTool(name: string, input: Record<string, unknown>) {
    if (name === "get_dashboard_snapshot") return getDashboardSnapshot();
    if (name === "get_campaign_team") return getCampaignTeam(input.code as string);
    if (name === "remember_fact") return rememberFact(input.content as string);
    return { error: `Unknown tool ${name}` };
  }

  const anthropic = new Anthropic({ apiKey });

  const knowledgeBlock =
    (knowledge ?? []).length > 0
      ? `\n\nStanding knowledge the agency's admin has taught you in past conversations (treat as established; if two entries conflict, trust the one listed later):\n${(knowledge ?? [])
          .map((k) => `- ${k.content}`)
          .join("\n")}`
      : "";

  const systemPrompt = `You are the internal assistant for DYOR Studio, a digital media agency. You're speaking with ${profile.full_name}, who is a ${requesterRoleLabel}.

Every question, always call get_dashboard_snapshot first — never answer from memory or from earlier in this conversation, since tasks, deadlines, and client activity change constantly and you need the current state every time. Use ONLY what your tools return; never guess or invent details, figures, or people. Budget, ad spend, and ROAS are not available through this assistant; if asked, say so plainly and suggest asking Nasir directly.

Keep answers short and direct, in a friendly, professional customer-service tone — a sentence or two for a simple question, a short list only when it genuinely helps. No long preambles or filler.

When the question is about who's involved, who worked on something, or who to loop in on a campaign, call get_campaign_team and suggest a specific person by name and role based on that data. Only ever name someone who actually appears in tool results — never invent a name — and don't suggest ${profile.full_name} loop themselves in.${
    isAdmin
      ? "\n\nYou're talking to the admin right now — use remember_fact whenever they tell you something worth keeping for every future conversation with anyone on the team."
      : ""
  }${knowledgeBlock}`;

  const messages: MessageParam[] = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content }) as MessageParam),
    { role: "user", content: question },
  ];

  const availableTools = [
    DASHBOARD_SNAPSHOT_TOOL,
    GET_CAMPAIGN_TEAM_TOOL,
    ...(isAdmin ? [REMEMBER_FACT_TOOL] : []),
  ];

  let finalText = "";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const isFirstTurn = turn === 0;
    const isLastTurn = turn === MAX_TURNS - 1;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 500,
      system: systemPrompt,
      messages,
      ...(isLastTurn
        ? {}
        : {
            tools: availableTools,
            tool_choice: isFirstTurn
              ? { type: "tool" as const, name: "get_dashboard_snapshot" }
              : { type: "auto" as const },
          }),
    });

    messages.push({ role: "assistant", content: response.content });

    const toolUseBlocks = response.content.filter((block) => block.type === "tool_use");
    if (toolUseBlocks.length === 0) {
      finalText = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n")
        .trim();
      break;
    }

    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block) => ({
        type: "tool_result" as const,
        tool_use_id: block.id,
        content: JSON.stringify(await executeTool(block.name, block.input as Record<string, unknown>)),
      }))
    );
    messages.push({ role: "user", content: toolResults });
  }

  if (!finalText) {
    finalText = "Sorry, I couldn't put together an answer to that — try rephrasing the question.";
  }

  return NextResponse.json({ answer: finalText });
}
