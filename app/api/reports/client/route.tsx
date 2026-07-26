import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/roles";
import { classifyPerformance, engagementScore } from "@/lib/analytics/metrics";
import { totalSalesValue, totalUnitsSold } from "@/lib/analytics/sales";
import { ClientReportDocument, type ReportSections } from "@/lib/reports/client-report-document";
import {
  REPORT_LANGUAGE_NAMES,
  translatedPriorityLabel,
  translatedRoleLabel,
  translatedStatusLabel,
  translatedUnassigned,
  type ReportLanguage,
} from "@/lib/reports/i18n";

async function generateAdvice(stats: {
  clientName: string;
  doneTasks: number;
  totalTasks: number;
  salesGrowthPercent: number | null;
  roas: number | null;
  adSpend: number | null;
  bestAssetTitle: string | null;
  worstAssetTitle: string | null;
  language: ReportLanguage;
}): Promise<string[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const anthropic = new Anthropic({ apiKey });

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    tools: [
      {
        name: "give_advice",
        description: "Give exactly 3 short, concrete pieces of advice for a better month ahead.",
        input_schema: {
          type: "object",
          properties: {
            advice: {
              type: "array",
              items: { type: "string" },
              minItems: 3,
              maxItems: 3,
            },
          },
          required: ["advice"],
        },
      },
    ],
    tool_choice: { type: "tool", name: "give_advice" },
    messages: [
      {
        role: "user",
        content: `You advise a small digital media PR agency on client strategy. Based on this period's numbers for ${stats.clientName}, give exactly 3 short, specific, actionable pieces of advice for doing better next month. Each should be one sentence, concrete (not generic platitudes), and grounded in the numbers given. Write the advice in ${REPORT_LANGUAGE_NAMES[stats.language]}.

Tasks completed: ${stats.doneTasks} of ${stats.totalTasks}
Sales growth: ${stats.salesGrowthPercent != null ? `${stats.salesGrowthPercent}%` : "no data"}
ROAS: ${stats.roas ?? "no data"}
Ad spend: ${stats.adSpend != null ? `${stats.adSpend} kr` : "no data"}
Best performing content asset: ${stats.bestAssetTitle ?? "no data"}
Weakest performing content asset: ${stats.worstAssetTitle ?? "no data"}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") return [];

  const input = toolUse.input as { advice: string[] };
  return input.advice ?? [];
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clientId, sections, language } = body as {
    clientId?: string;
    sections?: ReportSections;
    language?: ReportLanguage;
  };

  if (!clientId || !sections || !language) {
    return NextResponse.json({ error: "Missing clientId, sections, or language" }, { status: 400 });
  }

  const [{ data: client }, { data: tasks }, { data: assets }, { data: reports }, { data: sales }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase
        .from("tasks")
        .select("*, assignee:profiles!tasks_assignee_id_fkey(role)")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false }),
      supabase.from("content_assets").select("*").eq("client_id", clientId),
      supabase
        .from("client_reports")
        .select("*")
        .eq("client_id", clientId)
        .order("report_date", { ascending: false }),
      supabase.from("client_sales").select("*").eq("client_id", clientId),
    ]);

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  const taskRows = (tasks ?? []) as unknown as Array<{
    title: string;
    status: string;
    priority: string;
    ai_estimated_minutes: number | null;
    created_at: string;
    assignee: { role: UserRole } | null;
  }>;
  const assetRows = assets ?? [];
  const reportRows = reports ?? [];
  const saleRows = sales ?? [];

  const roleCounts = new Map<string, number>();
  const roleDoneCounts = new Map<string, number>();
  let totalHours = 0;
  for (const t of taskRows) {
    const role = t.assignee?.role;
    if (role) {
      roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
      if (t.status === "done") {
        roleDoneCounts.set(role, (roleDoneCounts.get(role) ?? 0) + 1);
      }
    }
    if (t.ai_estimated_minutes) totalHours += t.ai_estimated_minutes / 60;
  }

  let topRole: { role: string; doneCount: number } | null = null;
  for (const [role, count] of roleDoneCounts.entries()) {
    if (!topRole || count > topRole.doneCount) {
      topRole = { role: translatedRoleLabel(role, language), doneCount: count };
    }
  }

  const tiers = classifyPerformance(assetRows);

  let bestAsset: { title: string; platform: string } | null = null;
  let worstAsset: { title: string; platform: string } | null = null;
  if (assetRows.length > 0) {
    const scored = assetRows
      .map((a) => ({ a, score: engagementScore(a) }))
      .sort((x, y) => y.score - x.score);
    bestAsset = { title: scored[0].a.title, platform: scored[0].a.asset_type };
    const worst = scored[scored.length - 1];
    worstAsset = { title: worst.a.title, platform: worst.a.asset_type };
  }

  const latestReport = reportRows[0] ?? null;
  const salesCampaign = {
    salesGrowthPercent: latestReport?.sales_percent ?? null,
    roas: latestReport?.roas ?? null,
    adSpend: latestReport?.ad_spend ?? null,
    appDownloads: latestReport?.app_downloads ?? null,
    valueSold: totalSalesValue(saleRows),
    unitsSold: totalUnitsSold(saleRows),
    reportDate: latestReport?.report_date ?? null,
  };

  const advice = sections.advice
    ? await generateAdvice({
        clientName: client.name,
        doneTasks: taskRows.filter((t) => t.status === "done").length,
        totalTasks: taskRows.length,
        salesGrowthPercent: salesCampaign.salesGrowthPercent,
        roas: salesCampaign.roas,
        adSpend: salesCampaign.adSpend,
        bestAssetTitle: bestAsset?.title ?? null,
        worstAssetTitle: worstAsset?.title ?? null,
        language,
      })
    : [];

  const pdfBuffer = await renderToBuffer(
    <ClientReportDocument
      data={{
        clientName: client.name,
        clientDescription: client.description,
        generatedAt: new Date().toISOString(),
        language,
        sections,
        stats: {
          totalTasks: taskRows.length,
          doneTasks: taskRows.filter((t) => t.status === "done").length,
          totalHours,
          roleActivity: Array.from(roleCounts.entries()).map(([role, count]) => ({
            role: translatedRoleLabel(role, language),
            count,
          })),
          topRole,
        },
        tasks: taskRows.map((t) => ({
          title: t.title,
          status: translatedStatusLabel(t.status, language),
          priority: translatedPriorityLabel(t.priority, language),
          assigneeRole: t.assignee?.role
            ? translatedRoleLabel(t.assignee.role, language)
            : translatedUnassigned(language),
          hours: t.ai_estimated_minutes ? t.ai_estimated_minutes / 60 : null,
          createdAt: t.created_at,
        })),
        assets: assetRows.map((a) => ({
          title: a.title,
          platform: a.asset_type,
          views: a.views,
          likes: a.likes,
          comments: a.comments,
          shares: a.shares,
          tier: tiers.get(a.id) ?? "normal",
        })),
        bestAsset,
        worstAsset,
        salesCampaign,
        advice,
      }}
    />
  );

  return new NextResponse(pdfBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${client.name.replace(/[^a-z0-9]/gi, "-")}-report.pdf"`,
    },
  });
}
