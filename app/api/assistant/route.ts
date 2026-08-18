import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/auth/roles";
import { channelLabel } from "@/lib/campaigns/constants";

const INVOLVEMENT_WINDOW_DAYS = 180;
const MAX_TURNS = 4;

type ChatMessage = { role: "user" | "assistant"; content: string };

const LIST_CAMPAIGNS_TOOL = {
  name: "list_campaigns",
  description:
    "List every campaign record — code, name, client, status, distribution channels, publication date, and who created it. Never includes budget, ad spend, or ROAS; those figures are not available through this tool. Always call this before answering any question about campaigns.",
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

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
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

  const { data: roles } = await supabase.from("roles").select("value, label");
  const roleOptions = roles ?? [];
  const requesterRoleLabel = roleLabel(profile.role, roleOptions);

  async function listCampaigns() {
    const { data } = await supabase
      .from("campaigns")
      .select("code, name, status, distribution_channels, publication_date, creator:profiles(full_name, role), client:clients(name)")
      .order("publication_date", { ascending: false, nullsFirst: false })
      .limit(200);

    return (data ?? []).map((c) => {
      const creator = c.creator as unknown as { full_name: string; role: string } | null;
      const client = c.client as unknown as { name: string } | null;
      return {
        code: c.code,
        name: c.name,
        client: client?.name ?? null,
        status: c.status,
        channels: c.distribution_channels.map(channelLabel),
        publication_date: c.publication_date,
        created_by: creator ? { name: creator.full_name, role: roleLabel(creator.role, roleOptions) } : null,
      };
    });
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

  async function executeTool(name: string, input: Record<string, unknown>) {
    if (name === "list_campaigns") return listCampaigns();
    if (name === "get_campaign_team") return getCampaignTeam(input.code as string);
    return { error: `Unknown tool ${name}` };
  }

  const anthropic = new Anthropic({ apiKey });

  const systemPrompt = `You are the internal assistant for DYOR Studio, a digital media agency. You're speaking with ${profile.full_name}, who is a ${requesterRoleLabel}.

Answer questions about the agency's ad campaigns using ONLY the data your tools return — never guess or invent campaign details, figures, or people. Budget, ad spend, and ROAS are not available through this assistant; if asked, say so plainly and suggest asking Nasir directly.

Keep answers short and direct, in a friendly, professional customer-service tone — a sentence or two for a simple question, a short list only when it genuinely helps. No long preambles or filler.

When the question is about who's involved, who worked on something, or who to loop in, call get_campaign_team and suggest a specific person by name and role based on that data. Only ever name someone who actually appears in the tool results — never invent a name — and don't suggest ${profile.full_name} loop themselves in.`;

  const messages: MessageParam[] = [
    ...(history ?? []).map((m) => ({ role: m.role, content: m.content }) as MessageParam),
    { role: "user", content: question },
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
            tools: [LIST_CAMPAIGNS_TOOL, GET_CAMPAIGN_TEAM_TOOL],
            tool_choice: isFirstTurn ? { type: "tool" as const, name: "list_campaigns" } : { type: "auto" as const },
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
