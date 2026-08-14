import { createAdminClient } from "@/lib/supabase/admin";
import { isValidPathSlug } from "@/lib/whitelabel/reserved-slugs";

// Reverse-proxies dyor.studio/{slug}/* through to that tenant's own,
// independently-deployed dashboard (whitelabel_tenants.app_url). This is a
// real proxy, not a redirect — the browser only ever talks to this
// origin, so the tenant's own auth cookies, CORS, and same-origin checks
// all work exactly as if the app genuinely lived here.
//
// This only works because the tenant's own deployment is built with
// NEXT_PUBLIC_BASE_PATH=/{slug} (see next.config.ts), which makes every
// asset/route Next.js emits on their end already carry the /{slug}
// prefix — so forwarding the request's path unchanged lines up with what
// their app expects, and two tenants' /_next/static/* bundles never
// collide under this shared domain.
//
// Realtime (Supabase websocket) traffic bypasses this proxy entirely —
// the tenant's browser JS connects directly to their own Supabase
// project's wss:// endpoint using env vars baked into their build, not
// through this app's server at all.

const STRIPPED_RESPONSE_HEADERS = new Set([
  "content-encoding", // fetch() already decompressed the body for us
  "content-length", // stale once headers/body pass through fetch
  "transfer-encoding",
  "connection",
]);

async function findTenantAppUrl(slug: string): Promise<string | null> {
  if (!isValidPathSlug(slug)) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("whitelabel_tenants")
    .select("app_url, status")
    .eq("path_slug", slug)
    .maybeSingle();

  // Requires the admin to have manually flipped status to "live" after
  // confirming the tenant's own deploy actually succeeded (see
  // whitelabel-tenants-panel.tsx) — a stored app_url alone isn't enough,
  // since it's hand-entered and could be wrong or not-yet-live.
  if (!data || data.status !== "live" || !data.app_url) return null;
  return data.app_url;
}

async function proxy(request: Request, slug: string): Promise<Response> {
  const appUrl = await findTenantAppUrl(slug);
  if (!appUrl) {
    return new Response("Not found", { status: 404 });
  }

  const incoming = new URL(request.url);
  const target = new URL(appUrl);
  target.pathname = incoming.pathname;
  target.search = incoming.search;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = !["GET", "HEAD"].includes(request.method);

  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!STRIPPED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value);
    }
  });

  // A redirect back to the tenant's own bare origin (e.g. after an auth
  // action) needs to point at this domain instead, or the browser would
  // jump off to their real deployment and break the /{slug} illusion.
  const location = responseHeaders.get("location");
  if (location) {
    const rewritten = new URL(location, target);
    if (rewritten.origin === target.origin) {
      rewritten.protocol = incoming.protocol;
      rewritten.host = incoming.host;
      responseHeaders.set("location", rewritten.toString());
    }
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

type RouteParams = { params: Promise<{ slug: string; path?: string[] }> };

export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}

export async function POST(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}

export async function PATCH(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}

export async function DELETE(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}

export async function HEAD(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  return proxy(request, slug);
}
