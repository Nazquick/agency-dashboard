import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isMasterKeyUser } from "@/lib/auth/roles";

async function requireMasterKey() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", user.id)
    .single();

  if (!isMasterKeyUser(profile?.email)) {
    return {
      error: NextResponse.json(
        { error: "Only the admin account can do this" },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const auth = await requireMasterKey();
  if (auth.error) return auth.error;

  const body = await request.json();
  const { email, password } = body as { email?: string; password?: string };

  if (!email && !password) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  if (password && password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();

  const attrs: { email?: string; email_confirm?: true; password?: string } = {};
  if (email) {
    attrs.email = email;
    attrs.email_confirm = true;
  }
  if (password) {
    attrs.password = password;
  }

  const { error: authError } = await admin.auth.admin.updateUserById(memberId, attrs);

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ success: true });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .update({ email })
    .eq("id", memberId)
    .select()
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ profile });
}

// A hard delete cascades from auth.users into profiles, but every table that
// references profiles for history (tasks, content_assets, client_reports, …)
// does so with NO ACTION on purpose — deleting a member who ever did any
// work always fails with a foreign key violation. Deactivate instead: ban
// the auth user so they can't sign in, and flag the profile as inactive so
// it drops out of team rosters and assignee pickers, without losing any of
// the history attached to it.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const auth = await requireMasterKey();
  if (auth.error) return auth.error;

  if (memberId === auth.userId) {
    return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { error: banError } = await admin.auth.admin.updateUserById(memberId, {
    ban_duration: "876000h", // ~100 years — Supabase has no literal "permanent"
  });
  if (banError) {
    return NextResponse.json({ error: banError.message }, { status: 400 });
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ active: false })
    .eq("id", memberId);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

// Undo a deactivation: re-flag the profile active, and lift the ban — unless
// this is an external member, who must stay permanently unable to sign in
// regardless of active status.
export async function PUT(
  _request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const { memberId } = await params;
  const auth = await requireMasterKey();
  if (auth.error) return auth.error;

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("profiles")
    .select("is_external")
    .eq("id", memberId)
    .single();
  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  if (!existing.is_external) {
    const { error: unbanError } = await admin.auth.admin.updateUserById(memberId, {
      ban_duration: "none",
    });
    if (unbanError) {
      return NextResponse.json({ error: unbanError.message }, { status: 400 });
    }
  }

  const { error: profileError } = await admin
    .from("profiles")
    .update({ active: true })
    .eq("id", memberId);
  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
