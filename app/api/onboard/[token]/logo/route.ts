import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_LOGO_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];

async function loadPendingInvite(admin: ReturnType<typeof createAdminClient>, token: string) {
  const { data: invite } = await admin
    .from("whitelabel_invites")
    .select("id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
  return invite;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const invite = await loadPendingInvite(admin, token);
  if (!invite) {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "Use a PNG, JPEG, SVG, or WebP image" }, { status: 400 });
  }

  if (file.size > MAX_LOGO_BYTES) {
    return NextResponse.json({ error: "Logo must be under 5MB" }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "png";
  const storagePath = `${token}/logo-${Date.now()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from("whitelabel-logos")
    .upload(storagePath, file, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 400 });
  }

  const {
    data: { publicUrl },
  } = admin.storage.from("whitelabel-logos").getPublicUrl(storagePath);

  return NextResponse.json({ url: publicUrl });
}
