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

// supabase-js hands back the *existing* channel when asked for a topic it
// already has, and removeChannel() is asynchronous — so a remounted
// component (React Strict Mode, a fast back-navigation) can be given the
// previous, already-subscribed channel and .on() then throws "cannot add
// postgres_changes callbacks ... after subscribe()". A fresh name per
// subscription makes that impossible. Only call this inside an effect.
export function uniqueChannelName(base: string): string {
  return `${base}-${Math.random().toString(36).slice(2, 10)}`;
}
