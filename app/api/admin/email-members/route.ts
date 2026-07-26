import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { sendBroadcast, EmailNotConfiguredError } from "@/lib/email/resend";
import { textToHtml } from "@/lib/email/text-to-html";

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
  const { subject, body: message } = body as { subject?: string; body?: string };

  if (!subject || !message) {
    return NextResponse.json({ error: "Subject and body are required" }, { status: 400 });
  }

  const { data: members } = await supabase
    .from("profiles")
    .select("email")
    .neq("role", "client")
    .eq("active", true);
  const recipients = [...new Set((members ?? []).map((m) => m.email))];

  try {
    await sendBroadcast({ to: recipients, subject, html: textToHtml(message) });
  } catch (error) {
    if (error instanceof EmailNotConfiguredError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send email" },
      { status: 500 }
    );
  }

  await supabase.from("email_broadcasts").insert({
    audience: "members",
    subject,
    body: message,
    recipient_count: recipients.length,
    sent_by: user.id,
  });

  return NextResponse.json({ recipientCount: recipients.length });
}
