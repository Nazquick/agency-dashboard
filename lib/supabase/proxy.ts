import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { RESERVED_SLUGS } from "@/lib/whitelabel/reserved-slugs";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
      // Keep the session cookie alive across browser/app restarts (400 days
      // — the max any browser will honor) instead of a session-only cookie.
      cookieOptions: { maxAge: 60 * 60 * 24 * 400 },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  // Any first path segment that isn't one of DYOR's own routes belongs to
  // app/[slug]/[[...path]]/route.ts — the reverse proxy for a tenant's
  // path-based dashboard (dyor.studio/{slug}). That route enforces its
  // own access via the proxied app's own auth, not this middleware, and
  // 404s cleanly for an unregistered slug — so every non-reserved first
  // segment is treated as public here regardless of DYOR login state.
  const firstSegment = pathname.split("/")[1] ?? "";
  const isTenantProxyPath = firstSegment !== "" && !RESERVED_SLUGS.includes(firstSegment);

  // "/onboard/[token]" is the public white-label onboarding form — reached
  // via a one-time link, never requires a login of its own. The setup SQL
  // script it links to lives under /whitelabel/ and must stay reachable
  // for the same unauthenticated visitor.
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/onboard/") ||
    pathname.startsWith("/whitelabel/") ||
    isTenantProxyPath;

  // Sign-in now lives inline on "/" (no separate /login page), so
  // unauthenticated visitors bounce there instead.
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // The inline sign-in form only redirects at the moment of signing in —
  // a returning visitor who already has a live session and lands on "/"
  // directly (bookmark, typed URL) needs the same landing behavior, or
  // they'd just see the marketing page again despite being logged in.
  if (user && pathname === "/") {
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    const url = request.nextUrl.clone();
    url.pathname = profile?.role === "client" ? "/portal" : "/today";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
