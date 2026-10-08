import type { SupabaseClient } from "@supabase/supabase-js";

// Page and layout code only needs to know *who* is signed in, and the proxy
// has already done the authoritative server-side check (auth.getUser()) for
// this very request. getClaims() reads the verified JWT locally instead of
// making another round trip to the auth server on every layout and page.
export async function getSessionUser(supabase: SupabaseClient): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  return id ? { id } : null;
}
