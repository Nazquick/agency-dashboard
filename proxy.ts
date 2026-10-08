import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest and sw.js are fetched by the browser without a
    // session cookie (the manifest request omits credentials), so they must
    // bypass the auth redirect or they come back as an HTML redirect to "/".
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest$|sw\\.js$|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov|m4v)$).*)",
  ],
};
