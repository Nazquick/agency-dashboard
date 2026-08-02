import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriodStart } from "@/lib/analytics/metrics";

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
    .select("role, client_id, client_group_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || (!profile.client_id && !profile.client_group_id)) {
    return NextResponse.json({ error: "Only client accounts can top up credits" }, { status: 403 });
  }

  const body = await request.json();
  const { clientId } = body as { clientId?: string };

  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("name, group_id, monthly_credit_limit, monthly_fee")
    .eq("id", clientId)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // Never trust the client-supplied id blindly — it must be the caller's
  // own single location, or a location in their master-account group.
  const belongsToCaller =
    clientId === profile.client_id ||
    (profile.client_group_id != null && client.group_id === profile.client_group_id);

  if (!belongsToCaller) {
    return NextResponse.json({ error: "You don't have access to this location" }, { status: 403 });
  }

  if (client.monthly_fee == null) {
    return NextResponse.json(
      { error: "Top-ups aren't enabled for this account yet — contact your account manager." },
      { status: 400 }
    );
  }

  const baseLimit = client.monthly_credit_limit ?? 8;
  const chargeAmount = Number(client.monthly_fee) * 0.5;
  const periodStart = currentPeriodStart();

  const { data: topup, error } = await admin
    .from("credit_topups")
    .insert({
      client_id: clientId,
      period_start: periodStart,
      credits_added: baseLimit,
      charge_amount: chargeAmount,
      approved_by: user.id,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already topped up this month" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Internal ledger entry only — no real payment is executed here, same as
  // the existing overage-billing "Request payment" action in the Admin panel.
  await admin.from("company_transactions").insert({
    type: "income",
    category: "Credit top-up",
    amount: chargeAmount,
    description: `${client.name} — credit top-up`,
    created_by: user.id,
  });

  return NextResponse.json({ topup });
}
