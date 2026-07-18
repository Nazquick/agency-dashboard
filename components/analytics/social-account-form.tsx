"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { PLATFORMS } from "@/lib/analytics/constants";
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

const socialAccountSchema = z.object({
  platform: z.enum([
    "instagram",
    "tiktok",
    "youtube",
    "facebook",
    "twitter_x",
    "linkedin",
    "other",
  ]),
  handle: z.string().min(1, "Handle is required"),
  url: z.string().optional(),
});

type SocialAccountFormValues = z.infer<typeof socialAccountSchema>;

export function SocialAccountForm({
  clientId,
  onSuccess,
}: {
  clientId: string;
  onSuccess: (account: Tables<"client_social_accounts">) => void;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<SocialAccountFormValues>({
    resolver: zodResolver(socialAccountSchema),
    defaultValues: { platform: "instagram", handle: "", url: "" },
  });

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  async function onSubmit(values: SocialAccountFormValues) {
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_social_accounts")
      .insert({
        client_id: clientId,
        platform: values.platform,
        handle: values.handle,
        url: values.url || null,
      })
      .select()
      .single();
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Social account added");
    reset();
    setOpen(false);
    onSuccess(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Add social account
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add social account</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Platform</Label>
            <Controller
              name="platform"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORMS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="social-handle">Handle / username</Label>
            <Input id="social-handle" placeholder="@jonkburger" {...register("handle")} />
            {errors.handle && (
              <p className="text-sm text-destructive">{errors.handle.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="social-url">Profile URL (optional)</Label>
            <Input id="social-url" type="url" {...register("url")} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding…" : "Add account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
