import type { TablesInsert } from "@/lib/types/database.types";

// Explicit field-by-field DTO — never a spread of the raw request body.
// This is what structurally guarantees a tenant's Supabase service-role
// key (accepted transiently in the provisioning request) can never reach
// a database column, even by accident: there's no field here for it.
export function buildTenantInsert(input: {
  inviteId: string;
  businessName: string;
  contactName: string | null;
  contactEmail: string;
  logoUrl: string | null;
  layoutVariant: string;
  brandPrimaryColor: string | null;
  supabaseUrl: string;
  supabaseAnonKey: string;
  vercelDeployUrl: string;
  customDomain: string | null;
  pathSlug: string | null;
}): TablesInsert<"whitelabel_tenants"> {
  return {
    invite_id: input.inviteId,
    business_name: input.businessName,
    contact_name: input.contactName,
    contact_email: input.contactEmail,
    logo_url: input.logoUrl,
    layout_variant: input.layoutVariant,
    brand_primary_color: input.brandPrimaryColor,
    supabase_url: input.supabaseUrl,
    supabase_anon_key: input.supabaseAnonKey,
    vercel_deploy_url: input.vercelDeployUrl,
    custom_domain: input.customDomain,
    path_slug: input.pathSlug,
    dyor_admin_seeded: true,
    tenant_admin_seeded: true,
    status: "seeded",
  };
}
