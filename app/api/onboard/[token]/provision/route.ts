import { NextResponse } from "next/server";
import { createAdminClient, createRemoteAdminClient } from "@/lib/supabase/admin";
import { DYOR_SUPPORT_EMAIL } from "@/lib/auth/roles";
import { buildVercelDeployUrl } from "@/lib/whitelabel/vercel-deploy-url";
import { buildTenantInsert } from "@/lib/whitelabel/tenant-insert";
import { sendBroadcast, EmailNotConfiguredError } from "@/lib/email/resend";
import { isValidPathSlug } from "@/lib/whitelabel/reserved-slugs";

const LAYOUT_VARIANTS = ["top-nav", "sidebar", "compact", "minimal"];

type ProvisionBody = {
  business_name?: string;
  contact_name?: string | null;
  contact_email?: string;
  logo_url?: string | null;
  layout_variant?: string;
  brand_primary_color?: string | null;
  supabase_url?: string;
  supabase_anon_key?: string;
  supabase_service_role_key?: string;
  custom_domain?: string | null;
  path_slug?: string;
};

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Buffer.from(bytes).toString("base64url");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: invite } = await admin
    .from("whitelabel_invites")
    .select("id, status, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || invite.status !== "pending") {
    return NextResponse.json({ error: "This invite is no longer valid" }, { status: 400 });
  }
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: "This invite has expired" }, { status: 400 });
  }

  const body = (await request.json()) as ProvisionBody;
  const {
    business_name,
    contact_name,
    contact_email,
    logo_url,
    layout_variant,
    brand_primary_color,
    supabase_url,
    supabase_anon_key,
    supabase_service_role_key,
    custom_domain,
    path_slug,
  } = body;

  if (!business_name?.trim() || !contact_email?.trim()) {
    return NextResponse.json({ error: "Business name and admin email are required" }, { status: 400 });
  }
  if (!layout_variant || !LAYOUT_VARIANTS.includes(layout_variant)) {
    return NextResponse.json({ error: "Invalid layout" }, { status: 400 });
  }
  if (!supabase_url?.trim() || !supabase_anon_key?.trim() || !supabase_service_role_key?.trim()) {
    return NextResponse.json({ error: "Supabase connection details are required" }, { status: 400 });
  }
  const slug = path_slug?.trim().toLowerCase();
  if (!slug || !isValidPathSlug(slug)) {
    return NextResponse.json({ error: "Choose a valid dashboard address" }, { status: 400 });
  }
  const { data: slugTaken } = await admin
    .from("whitelabel_tenants")
    .select("id")
    .eq("path_slug", slug)
    .maybeSingle();
  if (slugTaken) {
    return NextResponse.json({ error: "That dashboard address is already taken" }, { status: 409 });
  }

  // Used once, right here, to seed the tenant's first two logins — never
  // persisted. buildTenantInsert() below has no field for it at all.
  const remoteAdmin = createRemoteAdminClient(supabase_url.trim(), supabase_service_role_key.trim());

  async function seedLogin(email: string, fullName: string) {
    const password = generatePassword();
    const { error } = await remoteAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role: "team_leader" },
    });
    // A previously-failed provisioning attempt retried against the same
    // tenant project would hit "already exists" here — treat as success
    // rather than blocking the retry.
    if (error && !error.message.toLowerCase().includes("already been registered")) {
      throw error;
    }
    return password;
  }

  let dyorPassword: string;
  let tenantPassword: string;
  try {
    dyorPassword = await seedLogin(DYOR_SUPPORT_EMAIL, "DYOR Support");
    tenantPassword = await seedLogin(contact_email.trim(), contact_name?.trim() || business_name.trim());
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't create your first logins — have you run the setup SQL script in your Supabase project yet? Check step 4 and try again.",
      },
      { status: 400 }
    );
  }

  try {
    await sendBroadcast({
      to: [DYOR_SUPPORT_EMAIL],
      subject: `White-label dashboard provisioned: ${business_name.trim()}`,
      html: `<p>A new white-label dashboard was set up for <strong>${business_name.trim()}</strong>.</p>
<p>Your login on their project: <strong>${DYOR_SUPPORT_EMAIL}</strong> / <code>${dyorPassword}</code></p>
<p>Change this password after your first sign-in. Their Supabase project: ${supabase_url.trim()}</p>`,
    });
  } catch (err) {
    if (!(err instanceof EmailNotConfiguredError)) {
      console.error("Failed to email DYOR admin credentials", err);
    }
    // Non-fatal — the password lives only in this request's memory and is
    // discarded either way. Recovery falls back to Supabase Auth's own
    // password-reset against that tenant project if the email is lost.
  }

  const vercelDeployUrl = buildVercelDeployUrl(business_name);

  const { data: tenant, error: insertError } = await admin
    .from("whitelabel_tenants")
    .insert(
      buildTenantInsert({
        inviteId: invite.id,
        businessName: business_name.trim(),
        contactName: contact_name?.trim() || null,
        contactEmail: contact_email.trim(),
        logoUrl: logo_url ?? null,
        layoutVariant: layout_variant,
        brandPrimaryColor: brand_primary_color ?? null,
        supabaseUrl: supabase_url.trim(),
        supabaseAnonKey: supabase_anon_key.trim(),
        vercelDeployUrl,
        customDomain: custom_domain?.trim() || null,
        pathSlug: slug,
      })
    )
    .select()
    .single();

  if (insertError || !tenant) {
    return NextResponse.json({ error: insertError?.message ?? "Setup failed" }, { status: 400 });
  }

  await admin
    .from("whitelabel_invites")
    .update({ status: "used", used_at: new Date().toISOString(), tenant_id: tenant.id })
    .eq("id", invite.id);

  return NextResponse.json({
    tenantId: tenant.id,
    vercelDeployUrl,
    envChecklist: [
      { name: "NEXT_PUBLIC_SUPABASE_URL", value: supabase_url.trim() },
      { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", value: supabase_anon_key.trim() },
      { name: "SUPABASE_SERVICE_ROLE_KEY", value: supabase_service_role_key.trim() },
      { name: "NEXT_PUBLIC_BRAND_NAME", value: business_name.trim() },
      { name: "NEXT_PUBLIC_LOGO_URL", value: logo_url ?? "" },
      { name: "NEXT_PUBLIC_BRAND_PRIMARY_COLOR", value: brand_primary_color ?? "" },
      { name: "NEXT_PUBLIC_LAYOUT_VARIANT", value: layout_variant },
      { name: "NEXT_PUBLIC_TENANT_ADMIN_EMAIL", value: contact_email.trim() },
      { name: "NEXT_PUBLIC_BASE_PATH", value: `/${slug}` },
    ],
    tenantAdminCredentials: { email: contact_email.trim(), password: tenantPassword },
    sqlScriptHref: "/whitelabel/tenant-schema.sql",
    pathSlug: slug,
  });
}
