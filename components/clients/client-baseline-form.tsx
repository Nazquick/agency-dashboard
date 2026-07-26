"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
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

// Blank inputs must stay blank (null), not become 0 — matches the same
// convention used in full-report-form.tsx.
const num = () =>
  z.preprocess((val) => (val === "" ? undefined : val), z.coerce.number().optional());

const baselineSchema = z.object({
  posts: num(),
  views: num(),
  likes: num(),
  comments: num(),
  shares: num(),
  mentions: num(),
  ad_spend: num(),
  roas: num(),
  sales: num(),
});

type BaselineFormValues = z.input<typeof baselineSchema>;
type BaselineFormOutput = z.output<typeof baselineSchema>;

const FIELDS: { key: keyof BaselineFormOutput; label: string; step?: string }[] = [
  { key: "posts", label: "Posts per period" },
  { key: "views", label: "Views" },
  { key: "likes", label: "Likes" },
  { key: "comments", label: "Comments" },
  { key: "shares", label: "Shares" },
  { key: "mentions", label: "Mentions" },
  { key: "ad_spend", label: "Ad spend (kr)", step: "0.01" },
  { key: "roas", label: "ROAS", step: "0.01" },
  { key: "sales", label: "Sales (kr)", step: "0.01" },
];

export function ClientBaselineForm({
  clientId,
  initialBaseline,
}: {
  clientId: string;
  initialBaseline: Tables<"client_baselines"> | null;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BaselineFormValues, unknown, BaselineFormOutput>({
    resolver: zodResolver(baselineSchema),
    defaultValues: {
      posts: initialBaseline?.posts ?? undefined,
      views: initialBaseline?.views ?? undefined,
      likes: initialBaseline?.likes ?? undefined,
      comments: initialBaseline?.comments ?? undefined,
      shares: initialBaseline?.shares ?? undefined,
      mentions: initialBaseline?.mentions ?? undefined,
      ad_spend: initialBaseline?.ad_spend ?? undefined,
      roas: initialBaseline?.roas ?? undefined,
      sales: initialBaseline?.sales ?? undefined,
    },
  });

  if (!isTeamLeader(profile.role)) {
    return null;
  }

  async function onSubmit(values: BaselineFormOutput) {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.from("client_baselines").upsert({
      client_id: clientId,
      posts: values.posts ?? null,
      views: values.views ?? null,
      likes: values.likes ?? null,
      comments: values.comments ?? null,
      shares: values.shares ?? null,
      mentions: values.mentions ?? null,
      ad_spend: values.ad_spend ?? null,
      roas: values.roas ?? null,
      sales: values.sales ?? null,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    });
    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Before-DYOR baseline saved");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          {initialBaseline ? "Edit before-DYOR numbers" : "Set before-DYOR numbers"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Before DYOR — baseline numbers</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          A one-time snapshot of this client&apos;s typical numbers before DYOR started managing
          them. Shown against their live numbers on the client portal&apos;s Analytics page. Leave
          anything blank you don&apos;t have data for.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 gap-4">
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={`baseline-${field.key}`}>{field.label}</Label>
              <Input
                id={`baseline-${field.key}`}
                type="number"
                min={0}
                step={field.step}
                {...register(field.key)}
              />
              {errors[field.key] && (
                <p className="text-sm text-destructive">{errors[field.key]?.message}</p>
              )}
            </div>
          ))}
          <Button type="submit" disabled={loading} className="col-span-2 w-full">
            {loading ? "Saving…" : "Save baseline"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
