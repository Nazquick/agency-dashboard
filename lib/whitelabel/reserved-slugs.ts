// Every top-level route this app itself owns, plus Next.js/browser special
// files — a tenant's path slug can never collide with one of these, since
// app/[slug]/[[...path]]/route.ts only ever gets a request Next's router
// couldn't match to something more specific first. Kept as an explicit
// list (rather than trying to introspect routes at runtime) so it's
// obvious and grep-able whenever a new top-level route is added.
export const RESERVED_SLUGS = [
  "admin",
  "analytics",
  "bounties",
  "calendar",
  "clients",
  "pipeline",
  "questions",
  "team",
  "api",
  "onboard",
  "portal",
  "whitelabel",
  "favicon.ico",
  "apple-icon.png",
  "manifest.webmanifest",
  "robots.txt",
  "sitemap.xml",
  "sw.js",
  "_next",
];

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function isValidPathSlug(slug: string): boolean {
  return (
    slug.length >= 2 &&
    slug.length <= 63 &&
    SLUG_PATTERN.test(slug) &&
    !RESERVED_SLUGS.includes(slug)
  );
}
