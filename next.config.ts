import type { NextConfig } from "next";

// Set only on a white-label tenant's own deployment (one of the env vars
// injected via the Vercel "Deploy Button" flow — see
// lib/whitelabel/vercel-deploy-url.ts) when they choose a path slug at
// onboarding. Unset here on DYOR's own production deployment, so this is
// a no-op there — basePath must be a literal string at build time
// (Next.js inlines it into the client bundle), never `undefined`.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
};

export default nextConfig;
