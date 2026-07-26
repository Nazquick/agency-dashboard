import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAfterMetrics } from "@/lib/analytics/portal-metrics";
import { PortalAnalytics } from "@/components/portal/portal-analytics";

export default async function PortalAnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("client_id")
    .eq("id", user.id)
    .single();
  if (!profile?.client_id) redirect("/");

  const [{ data: client }, { data: reports }, { data: assets }, { data: sales }, { data: baseline }] =
    await Promise.all([
      supabase.from("clients").select("name").eq("id", profile.client_id).single(),
      supabase.from("client_reports").select("*").eq("client_id", profile.client_id),
      supabase.from("content_assets").select("*").eq("client_id", profile.client_id),
      supabase.from("client_sales").select("*").eq("client_id", profile.client_id),
      supabase.from("client_baselines").select("*").eq("client_id", profile.client_id).maybeSingle(),
    ]);

  const after = computeAfterMetrics(reports ?? [], assets ?? [], sales ?? []);

  return (
    <PortalAnalytics
      clientName={client?.name ?? "Your business"}
      after={after}
      baseline={baseline ?? null}
    />
  );
}
