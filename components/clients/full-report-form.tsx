"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

// Blank inputs must stay blank (null), not become 0 — an untouched "Views"
// field means "no data," which is not the same as "0 views."
const num = () =>
  z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional());

const reportSchema = z.object({
  report_date: z.string().min(1, "Date is required"),
  instagram_views: num(),
  instagram_comments: num(),
  instagram_likes: num(),
  tiktok_views: num(),
  tiktok_comments: num(),
  tiktok_likes: num(),
  facebook_views: num(),
  facebook_comments: num(),
  facebook_likes: num(),
  snapchat_views: num(),
  snapchat_comments: num(),
  snapchat_likes: num(),
  campaign_name: z.string().optional(),
  campaign_sales: num(),
  roas: num(),
  ad_spend: num(),
  app_downloads: num(),
  sales_percent: num(),
  content_count: num(),
  content_type: z.string().optional(),
});

type ReportFormValues = z.input<typeof reportSchema>;
type ReportFormOutput = z.output<typeof reportSchema>;

const PLATFORMS = [
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "facebook", label: "Facebook" },
  { key: "snapchat", label: "Snapchat" },
] as const;

export function FullReportForm({ clientId, clientName }: { clientId: string; clientName: string }) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportFormValues, unknown, ReportFormOutput>({
    resolver: zodResolver(reportSchema),
    defaultValues: { report_date: todayIso() },
  });

  async function onSubmit(values: ReportFormOutput) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_reports").insert({
      client_id: clientId,
      submitted_by: profile.id,
      report_date: values.report_date,
      instagram_views: values.instagram_views ?? null,
      instagram_comments: values.instagram_comments ?? null,
      instagram_likes: values.instagram_likes ?? null,
      tiktok_views: values.tiktok_views ?? null,
      tiktok_comments: values.tiktok_comments ?? null,
      tiktok_likes: values.tiktok_likes ?? null,
      facebook_views: values.facebook_views ?? null,
      facebook_comments: values.facebook_comments ?? null,
      facebook_likes: values.facebook_likes ?? null,
      snapchat_views: values.snapchat_views ?? null,
      snapchat_comments: values.snapchat_comments ?? null,
      snapchat_likes: values.snapchat_likes ?? null,
      campaign_name: values.campaign_name || null,
      campaign_sales: values.campaign_sales ?? null,
      roas: values.roas ?? null,
      ad_spend: values.ad_spend ?? null,
      app_downloads: values.app_downloads ?? null,
      sales_percent: values.sales_percent ?? null,
      content_count: values.content_count ?? null,
      content_type: values.content_type || null,
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Report submitted");
    reset({ report_date: todayIso() });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Full report</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Full report — {clientName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="report-date">Report date</Label>
            <Input id="report-date" type="date" className="max-w-48" {...register("report_date")} />
            {errors.report_date && (
              <p className="text-sm text-destructive">{errors.report_date.message}</p>
            )}
          </div>

          {PLATFORMS.map((platform) => (
            <div key={platform.key} className="space-y-2 rounded-md border p-3">
              <p className="text-sm font-medium">{platform.label}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label htmlFor={`${platform.key}_views`} className="text-xs text-muted-foreground">
                    Views
                  </Label>
                  <Input
                    id={`${platform.key}_views`}
                    type="number"
                    min={0}
                    {...register(`${platform.key}_views` as "instagram_views")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${platform.key}_comments`} className="text-xs text-muted-foreground">
                    Comments
                  </Label>
                  <Input
                    id={`${platform.key}_comments`}
                    type="number"
                    min={0}
                    {...register(`${platform.key}_comments` as "instagram_comments")}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor={`${platform.key}_likes`} className="text-xs text-muted-foreground">
                    Likes
                  </Label>
                  <Input
                    id={`${platform.key}_likes`}
                    type="number"
                    min={0}
                    {...register(`${platform.key}_likes` as "instagram_likes")}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Campaign & ad performance</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="campaign_name" className="text-xs text-muted-foreground">
                  Campaign name
                </Label>
                <Input id="campaign_name" {...register("campaign_name")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="campaign_sales" className="text-xs text-muted-foreground">
                  Sales for this campaign (kr)
                </Label>
                <Input id="campaign_sales" type="number" min={0} step="0.01" {...register("campaign_sales")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="roas" className="text-xs text-muted-foreground">
                  ROAS
                </Label>
                <Input id="roas" type="number" min={0} step="0.01" {...register("roas")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="ad_spend" className="text-xs text-muted-foreground">
                  Ad spend (kr)
                </Label>
                <Input id="ad_spend" type="number" min={0} step="0.01" {...register("ad_spend")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="app_downloads" className="text-xs text-muted-foreground">
                  App downloads
                </Label>
                <Input id="app_downloads" type="number" min={0} {...register("app_downloads")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="sales_percent" className="text-xs text-muted-foreground">
                  Sales %
                </Label>
                <Input id="sales_percent" type="number" step="0.01" {...register("sales_percent")} />
              </div>
            </div>
          </div>

          <div className="space-y-3 rounded-md border p-3">
            <p className="text-sm font-medium">Content made</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="content_count" className="text-xs text-muted-foreground">
                  How much content
                </Label>
                <Input id="content_count" type="number" min={0} {...register("content_count")} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="content_type" className="text-xs text-muted-foreground">
                  Type
                </Label>
                <Input
                  id="content_type"
                  placeholder="e.g. 3 reels, 2 posters"
                  {...register("content_type")}
                />
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Leave anything blank that doesn&apos;t apply — nothing here is required.
          </p>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Submitting…" : "Submit report"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
