import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentPeriodStart } from "@/lib/analytics/metrics";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "client" || !profile.client_id) {
    return NextResponse.json({ error: "Only client accounts can top up credits" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: client } = await admin
    .from("clients")
    .select("name, monthly_credit_limit, monthly_fee")
    .eq("id", profile.client_id)
    .single();

  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (client.monthly_fee == null) {
    return NextResponse.json(
      { error: "Top-ups aren't enabled for your account yet — contact your account manager." },
      { status: 400 }
    );
  }

  const baseLimit = client.monthly_credit_limit ?? 8;
  const chargeAmount = Number(client.monthly_fee) * 0.5;
  const periodStart = currentPeriodStart();

  const { data: topup, error } = await admin
    .from("credit_topups")
    .insert({
      client_id: profile.client_id,
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
