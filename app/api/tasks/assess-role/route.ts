import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { ROLES, type UserRole } from "@/lib/auth/roles";

const ROLE_VALUES = ROLES.map((r) => r.value) as [UserRole, ...UserRole[]];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "AI role assessment isn't configured yet — ANTHROPIC_API_KEY is missing." },
      { status: 503 }
    );
  }

  const body = await request.json();
  const { title, description, task_type } = body as {
    title?: string;
    description?: string | null;
    task_type?: string | null;
  };

  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 300,
    tools: [
      {
        name: "assign_role",
        description:
          "Assign this task to the single team member who holds the most appropriate role.",
        input_schema: {
          type: "object",
          properties: {
            role: { type: "string", enum: ROLE_VALUES },
            reasoning: { type: "string" },
          },
          required: ["role", "reasoning"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "assign_role" },
    messages: [
      {
        role: "user",
        content: `You triage tasks for a small digital media PR agency. There is exactly one person per role: a videographer/photographer, an editor/graphic designer, and a social media manager; "team_leader" covers planning/client-facing/admin work. Given this task, decide which single role should own it.

Title: ${title}
Task type: ${task_type ?? "unspecified"}
Description: ${description ?? "none"}

Guidance: filming or photo shoots -> videographer_photographer. Video editing, graphic design, posters -> editor_designer. Scheduling, writing, or publishing social posts, community engagement -> social_media_manager. Planning, client communication, admin, budgeting -> team_leader.`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return NextResponse.json({ error: "AI did not return a role" }, { status: 502 });
  }

  const input = toolUse.input as { role: UserRole; reasoning: string };
  return NextResponse.json({ role: input.role, reasoning: input.reasoning });
}
