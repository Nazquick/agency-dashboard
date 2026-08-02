import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAfterMetrics, combineBaselines } from "@/lib/analytics/portal-metrics";
import { PortalAnalytics } from "@/components/portal/portal-analytics";

export default async function PortalAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id, client_group_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id && !profile?.client_group_id) redirect("/");

  const [{ data: client }, { data: group }, { data: reports }, { data: assets }, { data: sales }, { data: baselines }] =
    await Promise.all([
      profile.client_id
        ? supabase.from("clients").select("name").eq("id", profile.client_id).single()
        : Promise.resolve({ data: null }),
      profile.client_group_id
        ? supabase.from("client_groups").select("name").eq("id", profile.client_group_id).single()
        : Promise.resolve({ data: null }),
      supabase.from("client_reports").select("*"),
      supabase.from("content_assets").select("*"),
      supabase.from("client_sales").select("*"),
      supabase.from("client_baselines").select("*"),
    ]);

  const after = computeAfterMetrics(reports ?? [], assets ?? [], sales ?? []);
  const baseline = combineBaselines(baselines ?? []);

  return (
    <PortalAnalytics
      clientName={group?.name ?? client?.name ?? "Your business"}
      after={after}
      baseline={baseline}
    />
  );
}
