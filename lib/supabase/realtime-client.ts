import { createClient } from "@/lib/supabase/client";

// postgres_changes delivery is filtered server-side by RLS using the
// connection's JWT. @supabase/ssr's browser client can be instantiated from
// an existing cookie session without ever firing the auth event that wires
// this up automatically, so it must be set explicitly before subscribing.
export async function createRealtimeClient() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    supabase.realtime.setAuth(session.access_token);
  }
  return supabase;
}
