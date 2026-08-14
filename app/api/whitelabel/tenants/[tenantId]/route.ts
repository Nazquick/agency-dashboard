import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMasterKeyUser } from "@/lib/auth/roles";
import type { TablesUpdate } from "@/lib/types/database.types";

// Vercel's clone flow gives DYOR no webhook/callback for a tenant's deploy
// (see the white-label plan's known-gaps list) — app_url/status/notes are
// recorded here manually by the admin once they observe the deploy succeed.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const { tenantId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!isMasterKeyUser(profile?.email)) {
    return NextResponse.json({ error: "Only the admin account can do this" }, { status: 403 });
  }

  const body = await request.json();
  const { app_url, status, notes } = body as {
    app_url?: string | null;
    status?: string;
    notes?: string | null;
  };

  const update: TablesUpdate<"whitelabel_tenants"> = {};
  if (app_url !== undefined) update.app_url = app_url;
  if (notes !== undefined) update.notes = notes;
  if (status !== undefined) {
    if (!["provisioning", "seeded", "live", "failed"].includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    update.status = status;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whitelabel_tenants")
    .update(update)
    .eq("id", tenantId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ tenant: data });
}
