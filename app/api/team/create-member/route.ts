import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMasterKeyUser } from "@/lib/auth/roles";

const VALID_ROLES = [
  "editor_designer",
  "videographer_photographer",
  "social_media_manager",
  "team_leader",
];

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
    return NextResponse.json(
      { error: "Only the admin account can add team members" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, full_name, role, password } = body as {
    email?: string;
    full_name?: string;
    role?: string;
    password?: string;
  };

  if (
    !email ||
    !full_name ||
    !role ||
    !VALID_ROLES.includes(role) ||
    !password ||
    password.length < 8
  ) {
    return NextResponse.json({ error: "Missing or invalid fields" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data: newProfile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();

  return NextResponse.json({ profile: newProfile });
}
