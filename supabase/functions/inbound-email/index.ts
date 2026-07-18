// Postmark inbound webhook -> Action Pipeline task.
//
// Configure the Postmark inbound stream to POST to:
//   https://<project-ref>.supabase.co/functions/v1/inbound-email?secret=<INBOUND_EMAIL_SECRET>
//
// Postmark doesn't sign requests or carry a Supabase JWT, so auth is a
// shared secret in the query string instead (hence verify_jwt=false on
// deploy). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided
// automatically to every Edge Function; INBOUND_EMAIL_SECRET must be set
// manually as a function secret.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface PostmarkInboundPayload {
  From: string;
  Subject?: string;
  TextBody?: string;
  StrippedTextReply?: string;
  MessageID: string;
}

const URGENT_KEYWORDS = ["urgent", "asap", "emergency", "immediately"];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const providedSecret = url.searchParams.get("secret");
  const expectedSecret = Deno.env.get("INBOUND_EMAIL_SECRET");
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!payload.MessageID || !payload.From) {
    return new Response("Missing required fields (From, MessageID)", { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Idempotency: Postmark retries on any non-2xx response, so a replay of
  // the same MessageID should succeed quietly instead of creating a
  // duplicate task.
  const { data: existing } = await supabase
    .from("tasks")
    .select("id")
    .eq("source_email_id", payload.MessageID)
    .maybeSingle();

  if (existing) {
    return new Response(JSON.stringify({ status: "duplicate", taskId: existing.id }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const clientId = await matchClient(supabase, payload);

  const subject = payload.Subject?.trim() || "New task from email";
  const body = (payload.StrippedTextReply || payload.TextBody || "").trim().slice(0, 5000);
  const subjectLower = subject.toLowerCase();
  const priority = URGENT_KEYWORDS.some((k) => subjectLower.includes(k)) ? "urgent" : "medium";

  const { data: task, error } = await supabase
    .from("tasks")
    .insert({
      title: subject,
      description: body || null,
      client_id: clientId,
      priority,
      status: "not_started",
      source: "email",
      source_email_id: payload.MessageID,
    })
    .select("id")
    .single();

  if (error || !task) {
    console.error("Failed to insert task from inbound email", error);
    return new Response(JSON.stringify({ error: error?.message ?? "Insert failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ status: "created", taskId: task.id }), {
    headers: { "Content-Type": "application/json" },
  });
});

// Matches the sender to a client, trying (in order): an exact
// client_contacts.email match, any contact on the same domain, then a
// "[Client Name]" convention in the subject line. Unmatched mail still
// becomes a task (client_id null) for a human to triage.
async function matchClient(
  supabase: ReturnType<typeof createClient>,
  payload: PostmarkInboundPayload
): Promise<string | null> {
  const senderEmail = payload.From.toLowerCase().trim();
  const senderDomain = senderEmail.split("@")[1];

  const { data: exactContact } = await supabase
    .from("client_contacts")
    .select("client_id")
    .ilike("email", senderEmail)
    .limit(1)
    .maybeSingle();
  if (exactContact) return exactContact.client_id;

  if (senderDomain) {
    const { data: domainContact } = await supabase
      .from("client_contacts")
      .select("client_id")
      .ilike("email", `%@${senderDomain}`)
      .limit(1)
      .maybeSingle();
    if (domainContact) return domainContact.client_id;
  }

  const bracketMatch = payload.Subject?.match(/\[([^\]]+)\]/);
  if (bracketMatch) {
    const { data: client } = await supabase
      .from("clients")
      .select("id")
      .ilike("name", `%${bracketMatch[1].trim()}%`)
      .limit(1)
      .maybeSingle();
    if (client) return client.id;
  }

  return null;
}
