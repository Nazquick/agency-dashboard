import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database.types";

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    // Keep the session cookie alive across browser/app restarts (400 days —
    // the max any browser will honor) instead of falling back to a
    // session-only cookie that some browsers clear when the app is closed.
    { cookieOptions: { maxAge: 60 * 60 * 24 * 400 } }
  );
}
