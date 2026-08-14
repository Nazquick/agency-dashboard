// Read once at build time (Next.js inlines NEXT_PUBLIC_* vars into the
// client bundle) — unset on DYOR's own production deployment, so every
// value here defaults to today's DYOR branding and nothing changes there.
// Set on a white-label tenant's own deployment via the env values shown
// on their onboarding success screen (see
// lib/whitelabel/vercel-deploy-url.ts).
export const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME || "DYOR";
export const BRAND_LOGO_URL = process.env.NEXT_PUBLIC_LOGO_URL || null;
export const BRAND_PRIMARY_COLOR = process.env.NEXT_PUBLIC_BRAND_PRIMARY_COLOR || null;

export const LAYOUT_VARIANTS = ["top-nav", "sidebar", "compact", "minimal"] as const;
export type LayoutVariant = (typeof LAYOUT_VARIANTS)[number];

const rawLayoutVariant = process.env.NEXT_PUBLIC_LAYOUT_VARIANT;
export const LAYOUT_VARIANT: LayoutVariant = (
  LAYOUT_VARIANTS as readonly string[]
).includes(rawLayoutVariant ?? "")
  ? (rawLayoutVariant as LayoutVariant)
  : "top-nav";
