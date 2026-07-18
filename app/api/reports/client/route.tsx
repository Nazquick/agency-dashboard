import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { roleLabel, type UserRole } from "@/lib/auth/roles";
import { classifyPerformance } from "@/lib/analytics/metrics";
import { ClientReportDocument, type ReportSections } from "@/lib/reports/client-report-document";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { clientId, sections } = body as { clientId?: string; sections?: ReportSections };

  if (!clientId || !sections) {
    return NextResponse.json({ error: "Missing clientId or sections" }, { status: 400 });
  }

  const [{ data: client }, { data: tasks }, { data: assets }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase
      .from("tasks")
      .select("*, assignee:profiles!tasks_assignee_id_fkey(role)")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false }),
    supabase.from("content_assets").select("*").eq("client_id", clientId),
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

  const roleCounts = new Map<string, number>();
  let totalHours = 0;
  for (const t of taskRows) {
    const role = t.assignee?.role;
    if (role) roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
    if (t.ai_estimated_minutes) totalHours += t.ai_estimated_minutes / 60;
  }

  const tiers = classifyPerformance(assetRows);

  const pdfBuffer = await renderToBuffer(
    <ClientReportDocument
      data={{
        clientName: client.name,
        clientDescription: client.description,
        generatedAt: new Date().toISOString(),
        sections,
        stats: {
          totalTasks: taskRows.length,
          doneTasks: taskRows.filter((t) => t.status === "done").length,
          totalHours,
          roleActivity: Array.from(roleCounts.entries()).map(([role, count]) => ({
            role: roleLabel(role as UserRole),
            count,
          })),
        },
        tasks: taskRows.map((t) => ({
          title: t.title,
          status: t.status,
          priority: t.priority,
          assigneeRole: t.assignee?.role ? roleLabel(t.assignee.role) : "Unassigned",
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
