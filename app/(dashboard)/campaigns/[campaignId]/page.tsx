import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";
import type { CampaignWithClient } from "@/components/campaigns/campaign-form";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  if (!isMasterKeyUser(profile?.email)) {
    redirect("/today");
  }

  const [{ data: campaign }, { data: clients }] = await Promise.all([
    supabase.from("campaigns").select("*, client:clients(id, name)").eq("id", campaignId).maybeSingle(),
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
  ]);

  if (!campaign) {
    notFound();
  }

  return (
    <CampaignDetailView
      campaign={campaign as unknown as CampaignWithClient}
      clients={clients ?? []}
    />
  );
}
