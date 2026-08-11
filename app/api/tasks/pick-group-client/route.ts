import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeCreditStatus } from "@/lib/analytics/quota";
import { startOfCurrentMonthIso, currentPeriodStart } from "@/lib/analytics/metrics";

// Picks which single location in a client group should actually fulfil a
// "{Group} (ALL)" task — the first location (alphabetically, a fixed,
// predictable order) that still has any credit left this month, so the
// task lands on someone with room instead of creating a copy at every
// location. Credit/topup figures are billing-adjacent (credit_topups is
// leader-only to read directly), so this is computed server-side via the
// admin client rather than trusting a client-side calculation.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role === "client") {
    return NextResponse.json({ error: "Only staff can create group tasks" }, { status: 403 });
  }

  const body = await request.json();
  const { groupId } = body as { groupId?: string };
  if (!groupId) {
    return NextResponse.json({ error: "groupId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: group } = await admin.from("client_groups").select("id, name").eq("id", groupId).single();
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const { data: members } = await admin
    .from("clients")
    .select("id, name, monthly_credit_limit")
    .eq("group_id", groupId)
    .order("name");

  if (!members || members.length === 0) {
    return NextResponse.json({ error: "This group has no locations" }, { status: 400 });
  }

  const memberIds = members.map((m) => m.id);
  const monthStart = startOfCurrentMonthIso();

  const { data: tasks } = await admin
    .from("tasks")
    .select("client_id, created_at, task_type, archived")
    .in("client_id", memberIds)
    .gte("created_at", monthStart);

  const periodStart = currentPeriodStart();
  const { data: topups } = await admin
    .from("credit_topups")
    .select("client_id, period_start, credits_added")
    .in("client_id", memberIds)
    .eq("period_start", periodStart);

  const statuses = computeCreditStatus(members, tasks ?? [], topups ?? []);
  const chosen = statuses.find((s) => s.limit == null || s.used < s.limit) ?? statuses[0];

  return NextResponse.json({
    clientId: chosen.client.id,
    clientName: chosen.client.name,
    groupName: group.name,
    allOverLimit: statuses.every((s) => s.limit != null && s.used >= s.limit),
  });
}
