// Vercel's "Deploy Button" clone flow: the tenant clicks this, logs into
// their OWN Vercel (and GitHub, which Vercel auto-forks the template repo
// into), and deploys. DYOR holds no Vercel API token and makes no
// server-side Vercel API calls — everything past this URL happens on
// Vercel's own infrastructure.
//
// Vercel can only pre-fill env var *names* via `env=`, never values — the
// tenant pastes the actual values (see envChecklist in the provisioning
// route's response) into Vercel's own UI during the clone flow.

const TEMPLATE_REPO_URL = "https://github.com/Nazquick/agency-dashboard";

const REQUIRED_ENV_NAMES = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_BRAND_NAME",
  "NEXT_PUBLIC_LOGO_URL",
  "NEXT_PUBLIC_BRAND_PRIMARY_COLOR",
  "NEXT_PUBLIC_LAYOUT_VARIANT",
  "NEXT_PUBLIC_TENANT_ADMIN_EMAIL",
  "NEXT_PUBLIC_BASE_PATH",
];

export function slugifyBusinessName(name: string): string {
  return (
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "dashboard"
  );
}

export function buildVercelDeployUrl(businessName: string): string {
  const slug = slugifyBusinessName(businessName);
  const params = new URLSearchParams({
    "repository-url": TEMPLATE_REPO_URL,
    "project-name": slug,
    "repository-name": slug,
    env: REQUIRED_ENV_NAMES.join(","),
    envDescription: "Paste the values shown on the setup page you came from",
  });
  return `https://vercel.com/new/clone?${params.toString()}`;
}
