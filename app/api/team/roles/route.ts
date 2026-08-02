import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMasterKeyUser } from "@/lib/auth/roles";

function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

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
  const { label } = body as { label?: string };

  if (!label || !label.trim()) {
    return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  }

  const value = slugify(label);
  if (!value) {
    return NextResponse.json({ error: "Role name must contain letters or numbers" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("roles")
    .insert({ value, label: label.trim(), created_by: user.id })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A role with that name already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ role: data });
}
