"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const meetupSchema = z
  .object({
    purpose: z.string().min(1, "Purpose is required"),
    goal: z.string().optional(),
    starts_at: z.string().min(1, "Start time is required"),
    ends_at: z.string().min(1, "End time is required"),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: "End must be after start",
    path: ["ends_at"],
  });

type MeetupFormValues = z.infer<typeof meetupSchema>;

export function SuggestMeetupDialog({
  profiles,
  onSuccess,
}: {
  profiles: Pick<Tables<"profiles">, "id">[];
  onSuccess?: (proposal: Tables<"meetup_proposals">, responses: Tables<"meetup_responses">[]) => void;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<MeetupFormValues>({
    resolver: zodResolver(meetupSchema),
    defaultValues: { purpose: "", goal: "", starts_at: "", ends_at: "" },
  });

  async function onSubmit(values: MeetupFormValues) {
    setLoading(true);
    const supabase = createClient();

    const { data: proposal, error } = await supabase
      .from("meetup_proposals")
      .insert({
        purpose: values.purpose,
        goal: values.goal || null,
        starts_at: new Date(values.starts_at).toISOString(),
        ends_at: new Date(values.ends_at).toISOString(),
        proposed_by: profile.id,
      })
      .select()
      .single();

    if (error || !proposal) {
      setLoading(false);
      toast.error(error?.message ?? "Failed to create proposal");
      return;
    }

    const { data: responses, error: responsesError } = await supabase
      .from("meetup_responses")
      .insert(
        profiles.map((p) => ({
          proposal_id: proposal.id,
          profile_id: p.id,
          response: p.id === profile.id ? ("accepted" as const) : ("pending" as const),
          responded_at: p.id === profile.id ? new Date().toISOString() : null,
        }))
      )
      .select();

    if (responsesError) {
      setLoading(false);
      toast.error(responsesError.message);
      return;
    }

    await supabase.rpc("confirm_meetup_if_all_accepted", { p_proposal_id: proposal.id });

    setLoading(false);
    toast.success("Meetup proposed");
    setOpen(false);
    reset();
    onSuccess?.(proposal, responses ?? []);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Suggest a meetup</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Suggest a meetup</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="purpose">Purpose</Label>
            <Input id="purpose" placeholder="e.g. Q3 planning" {...register("purpose")} />
            {errors.purpose && (
              <p className="text-sm text-destructive">{errors.purpose.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal">Goal</Label>
            <Textarea
              id="goal"
              rows={3}
              placeholder="What should we walk away with?"
              {...register("goal")}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="meetup-starts-at">Starts</Label>
              <Input id="meetup-starts-at" type="datetime-local" {...register("starts_at")} />
              {errors.starts_at && (
                <p className="text-sm text-destructive">{errors.starts_at.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetup-ends-at">Ends</Label>
              <Input id="meetup-ends-at" type="datetime-local" {...register("ends_at")} />
              {errors.ends_at && (
                <p className="text-sm text-destructive">{errors.ends_at.message}</p>
              )}
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Sending…" : "Suggest meetup"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
