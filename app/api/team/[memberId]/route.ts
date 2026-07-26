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
  const { error } = await admin.auth.admin.deleteUser(memberId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
