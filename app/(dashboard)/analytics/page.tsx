import { createClient } from "@/lib/supabase/server";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default async function AnalyticsPage() {
  const supabase = await createClient();

  const [{ data: clients }, { data: tasks }, { data: events }, { data: socialAccounts }, { data: assets }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("archived", false).order("name"),
      supabase.from("tasks").select("client_id, created_at"),
      supabase.from("calendar_events").select("client_id, created_at"),
      supabase.from("client_social_accounts").select("*"),
      supabase.from("content_assets").select("*"),
    ]);

  return (
    <AnalyticsDashboard
      clients={clients ?? []}
      tasks={(tasks ?? []).filter((t) => t.client_id) as { client_id: string; created_at: string }[]}
      events={(events ?? []).filter((e) => e.client_id) as { client_id: string; created_at: string }[]}
      initialSocialAccounts={socialAccounts ?? []}
      initialAssets={assets ?? []}
    />
  );
}
