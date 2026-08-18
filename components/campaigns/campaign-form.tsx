"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser, useGroups } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import { CAMPAIGN_STATUSES, DISTRIBUTION_CHANNELS } from "@/lib/campaigns/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export type CampaignWithClient = Tables<"campaigns"> & {
  client: { id: string; name: string } | null;
};

const campaignSchema = z.object({
  client_id: z.string().min(1, "Choose a client"),
  name: z.string().min(1, "Name is required"),
  status: z.string().min(1, "Choose a status"),
  budget: z.string().optional(),
  ad_spend: z.string().optional(),
  roas: z.string().optional(),
  boost_location: z.string().optional(),
  publication_date: z.string().optional(),
  notes: z.string().optional(),
});

type CampaignFormValues = z.infer<typeof campaignSchema>;

function numOrNull(value: string | undefined): number | null {
  if (!value || value.trim() === "") return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

export function CampaignForm({
  campaign,
  clients,
  trigger,
  onSuccess,
  onDelete,
}: {
  campaign?: CampaignWithClient;
  clients: Pick<Tables<"clients">, "id" | "name" | "group_id">[];
  trigger: React.ReactNode;
  onSuccess?: (campaign: Tables<"campaigns">) => void;
  onDelete?: (id: string) => void;
}) {
  const profile = useUser();
  const groups = useGroups();
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<string[]>(campaign?.distribution_channels ?? []);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      client_id: "",
      name: "",
      status: "draft",
      budget: "",
      ad_spend: "",
      roas: "",
      boost_location: "",
      publication_date: "",
      notes: "",
    },
  });

  // Reset here (an event handler triggered by Dialog's own trigger-click
  // interaction) rather than in a useEffect keyed on `open` — that would
  // call setState synchronously inside an effect body.
  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) return;
    if (campaign) {
      reset({
        client_id: campaign.client_id,
        name: campaign.name,
        status: campaign.status,
        budget: campaign.budget != null ? String(campaign.budget) : "",
        ad_spend: campaign.ad_spend != null ? String(campaign.ad_spend) : "",
        roas: campaign.roas != null ? String(campaign.roas) : "",
        boost_location: campaign.boost_location ?? "",
        publication_date: campaign.publication_date ?? "",
        notes: campaign.notes ?? "",
      });
      setChannels(campaign.distribution_channels);
    } else {
      reset({
        client_id: "",
        name: "",
        status: "draft",
        budget: "",
        ad_spend: "",
        roas: "",
        boost_location: "",
        publication_date: "",
        notes: "",
      });
      setChannels([]);
    }
  }

  async function onSubmit(values: CampaignFormValues) {
    setSaving(true);
    const supabase = createClient();

    const payload = {
      client_id: values.client_id,
      name: values.name,
      status: values.status,
      budget: numOrNull(values.budget),
      ad_spend: numOrNull(values.ad_spend),
      roas: numOrNull(values.roas),
      boost_location: values.boost_location || null,
      distribution_channels: channels,
      publication_date: values.publication_date || null,
      notes: values.notes || null,
    };

    const { data, error } = campaign
      ? await supabase.from("campaigns").update(payload).eq("id", campaign.id).select().single()
      : await supabase
          .from("campaigns")
          .insert({ ...payload, created_by: profile.id })
          .select()
          .single();

    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Failed to save campaign");
      return;
    }

    setSaving(false);
    toast.success(campaign ? "Campaign updated" : "Campaign created");
    logActivity(supabase, {
      actorId: profile.id,
      action: campaign ? "campaign_updated" : "campaign_created",
      summary: campaign ? `Updated campaign "${values.name}"` : `Created campaign "${values.name}"`,
      entityType: "campaign",
      entityId: data.id,
    });
    onSuccess?.(data);
    setOpen(false);
  }

  async function handleDelete() {
    if (!campaign) return;
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("campaigns").delete().eq("id", campaign.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Campaign deleted");
    logActivity(supabase, {
      actorId: profile.id,
      action: "campaign_deleted",
      summary: `Deleted campaign "${campaign.name}"`,
      entityType: "campaign",
      entityId: campaign.id,
    });
    onDelete?.(campaign.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {campaign ? `Edit campaign — ${campaign.code}` : "New campaign"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Controller
                name="client_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {groups
                        .filter((g) => clients.some((c) => c.group_id === g.id) && g.all_client_id)
                        .map((g) => (
                          <SelectItem key={g.id} value={g.all_client_id as string}>
                            {g.name} (ALL)
                          </SelectItem>
                        ))}
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CAMPAIGN_STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-name">Campaign name</Label>
            <Input id="campaign-name" {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-budget">Budget</Label>
              <Input id="campaign-budget" type="number" step="0.01" min="0" {...register("budget")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-spend">Ad spend</Label>
              <Input id="campaign-spend" type="number" step="0.01" min="0" {...register("ad_spend")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-roas">ROAS</Label>
              <Input id="campaign-roas" type="number" step="0.01" min="0" {...register("roas")} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-boost-location">Boost location</Label>
              <Input id="campaign-boost-location" placeholder="e.g. Oslo, Norway" {...register("boost_location")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="campaign-pub-date">Publication date</Label>
              <Input id="campaign-pub-date" type="date" {...register("publication_date")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Distribution channels</Label>
            <div className="flex flex-wrap gap-3 rounded-md border p-2">
              {DISTRIBUTION_CHANNELS.map((c) => (
                <label key={c.value} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={channels.includes(c.value)}
                    onCheckedChange={(checked) =>
                      setChannels((prev) =>
                        checked ? [...prev, c.value] : prev.filter((v) => v !== c.value)
                      )
                    }
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="campaign-notes">Notes</Label>
            <Textarea id="campaign-notes" rows={3} {...register("notes")} />
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-4">
            {campaign ? (
              <Button type="button" variant="ghost" onClick={handleDelete}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : campaign ? "Save changes" : "Create campaign"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
