import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Service-role client — bypasses RLS. Never import this from a "use client"
// file; always gate its use with an explicit server-side auth check.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Targets an arbitrary (non-DYOR) Supabase project — used only inside the
// white-label provisioning route, for the single request that seeds a
// tenant's first two logins. The service-role key it's given is never
// persisted; this client only ever lives for the duration of that request.
export function createRemoteAdminClient(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
