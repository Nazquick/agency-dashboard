import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import type { CampaignWithClient } from "@/components/campaigns/campaign-form";

export default async function CampaignsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const { data: profile } = await supabase.from("profiles").select("email").eq("id", user.id).single();
  if (!isMasterKeyUser(profile?.email)) {
    redirect("/today");
  }

  const [{ data: campaigns }, { data: clients }] = await Promise.all([
    supabase.from("campaigns").select("*, client:clients(id, name)").order("created_at", { ascending: false }),
    supabase.from("clients").select("id, name, group_id").eq("archived", false).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Ad campaigns across every client — budget, spend, ROAS, and creative in one place.
        </p>
      </div>

      <CampaignsTable
        initialCampaigns={(campaigns ?? []) as unknown as CampaignWithClient[]}
        clients={clients ?? []}
      />
    </div>
  );
}
