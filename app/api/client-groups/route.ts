import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMasterKeyUser } from "@/lib/auth/roles";

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
    .select("email")
    .eq("id", user.id)
    .single();

  if (!isMasterKeyUser(profile?.email)) {
    return NextResponse.json({ error: "Only the admin account can do this" }, { status: 403 });
  }

  const body = await request.json();
  const { name } = body as { name?: string };

  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: group, error } = await admin
    .from("client_groups")
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (error || !group) {
    return NextResponse.json({ error: error?.message ?? "Failed to create group" }, { status: 400 });
  }

  // Every group gets its own selectable "(ALL)" pseudo client — assigning a
  // task to it puts the task under one normal client_id (no more one row
  // per real location), while credit still comes out of a real location's
  // budget via tasks.credit_client_id, set at task-save time.
  const { data: allClient, error: clientError } = await admin
    .from("clients")
    .insert({ name: `${group.name} (ALL)`, monthly_credit_limit: null, is_group_all: true })
    .select()
    .single();

  if (clientError || !allClient) {
    return NextResponse.json(
      { error: clientError?.message ?? "Failed to create the group's shared client" },
      { status: 400 }
    );
  }

  const { error: linkError } = await admin
    .from("client_groups")
    .update({ all_client_id: allClient.id })
    .eq("id", group.id);

  if (linkError) {
    return NextResponse.json({ error: linkError.message }, { status: 400 });
  }

  return NextResponse.json({ group: { ...group, all_client_id: allClient.id } });
}
