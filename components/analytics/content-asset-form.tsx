"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { ASSET_TYPES, platformLabel } from "@/lib/analytics/constants";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const assetSchema = z.object({
  social_account_id: z.string().min(1, "Choose a social account"),
  title: z.string().min(1, "Title is required"),
  asset_type: z.enum(["post", "reel", "video", "story", "carousel", "other"]),
  published_at: z.string().optional(),
  url: z.string().optional(),
  views: z.coerce.number().int().min(0),
  likes: z.coerce.number().int().min(0),
  comments: z.coerce.number().int().min(0),
  shares: z.coerce.number().int().min(0),
});

type AssetFormValues = z.input<typeof assetSchema>;
type AssetFormOutput = z.output<typeof assetSchema>;

export function ContentAssetForm({
  clientId,
  socialAccounts,
  asset,
  trigger,
  onSuccess,
}: {
  clientId: string;
  socialAccounts: Tables<"client_social_accounts">[];
  asset?: Tables<"content_assets">;
  trigger: React.ReactNode;
  onSuccess: (asset: Tables<"content_assets">) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<AssetFormValues, unknown, AssetFormOutput>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      social_account_id: asset?.social_account_id ?? socialAccounts[0]?.id ?? "",
      title: asset?.title ?? "",
      asset_type: asset?.asset_type ?? "post",
      published_at: asset?.published_at?.slice(0, 10) ?? "",
      url: asset?.url ?? "",
      views: asset?.views ?? 0,
      likes: asset?.likes ?? 0,
      comments: asset?.comments ?? 0,
      shares: asset?.shares ?? 0,
    },
  });

  async function onSubmit(values: AssetFormOutput) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      client_id: clientId,
      social_account_id: values.social_account_id,
      title: values.title,
      asset_type: values.asset_type,
      published_at: values.published_at ? new Date(values.published_at).toISOString() : null,
      url: values.url || null,
      views: values.views,
      likes: values.likes,
      comments: values.comments,
      shares: values.shares,
    };

    const result = asset
      ? await supabase
          .from("content_assets")
          .update(payload)
          .eq("id", asset.id)
          .select()
          .single()
      : await supabase.from("content_assets").insert(payload).select().single();

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(asset ? "Asset updated" : "Asset logged");
    setOpen(false);
    onSuccess(result.data);
  }

  if (socialAccounts.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{asset ? "Edit asset" : "Log a content asset"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Social account</Label>
            <Controller
              name="social_account_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {socialAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {platformLabel(a.platform)} — {a.handle}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-title">Title / description</Label>
            <Input id="asset-title" {...register("title")} />
            {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Controller
                name="asset_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ASSET_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-published">Published</Label>
              <Input id="asset-published" type="date" {...register("published_at")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="asset-url">Link (optional)</Label>
            <Input id="asset-url" type="url" {...register("url")} />
          </div>
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-2">
              <Label htmlFor="asset-views">Views</Label>
              <Input id="asset-views" type="number" min={0} {...register("views")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-likes">Likes</Label>
              <Input id="asset-likes" type="number" min={0} {...register("likes")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-comments">Comments</Label>
              <Input id="asset-comments" type="number" min={0} {...register("comments")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="asset-shares">Shares</Label>
              <Input id="asset-shares" type="number" min={0} {...register("shares")} />
            </div>
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : asset ? "Save changes" : "Log asset"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
