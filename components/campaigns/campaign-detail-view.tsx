"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Pencil } from "lucide-react";
import {
  campaignStatusBadgeClass,
  campaignStatusLabel,
  channelLabel,
} from "@/lib/campaigns/constants";
import { CampaignForm, type CampaignWithClient } from "@/components/campaigns/campaign-form";
import { CampaignAttachments } from "@/components/campaigns/campaign-attachments";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} kr`;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function CampaignDetailView({
  campaign: initialCampaign,
  clients,
}: {
  campaign: CampaignWithClient;
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
}) {
  const router = useRouter();
  const [campaign, setCampaign] = useState(initialCampaign);

  function handleUpdated(updated: Tables<"campaigns">) {
    const client = clients.find((c) => c.id === updated.client_id) ?? campaign.client;
    setCampaign({ ...updated, client });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{campaign.code}</p>
          <h1 className="text-2xl font-semibold tracking-tight">{campaign.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge className={campaignStatusBadgeClass(campaign.status)}>
              {campaignStatusLabel(campaign.status)}
            </Badge>
            {campaign.distribution_channels.map((v) => (
              <Badge key={v} variant="secondary">
                {channelLabel(v)}
              </Badge>
            ))}
          </div>
        </div>
        <CampaignForm
          campaign={campaign}
          clients={clients}
          trigger={
            <Button variant="outline">
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit
            </Button>
          }
          onSuccess={handleUpdated}
          onDelete={() => router.push("/campaigns")}
        />
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          <Field label="Client" value={campaign.client?.name ?? "—"} />
          <Field label="Budget" value={formatCurrency(campaign.budget)} />
          <Field label="Ad spend" value={formatCurrency(campaign.ad_spend)} />
          <Field label="ROAS" value={campaign.roas != null ? `${campaign.roas}x` : "—"} />
          <Field label="Boost location" value={campaign.boost_location ?? "—"} />
          <Field label="Publication date" value={formatDate(campaign.publication_date)} />
          <Field
            label="Created"
            value={new Date(campaign.created_at).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>
        {campaign.notes && (
          <div className="mt-4 border-t pt-4">
            <Field label="Notes" value={<p className="whitespace-pre-wrap">{campaign.notes}</p>} />
          </div>
        )}
      </div>

      <div className="rounded-lg border bg-card p-4">
        <CampaignAttachments campaignId={campaign.id} campaignLabel={campaign.name} />
      </div>
    </div>
  );
}
