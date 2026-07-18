"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader, ROLES, type UserRole } from "@/lib/auth/roles";
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

const memberSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  role: z.enum([
    "team_leader",
    "editor_designer",
    "videographer_photographer",
    "social_media_manager",
  ]),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export function EditMemberDialog({
  member,
  trigger,
  onSuccess,
}: {
  member: Tables<"profiles">;
  trigger: React.ReactNode;
  onSuccess?: (member: Tables<"profiles">) => void;
}) {
  const actor = useUser();
  const canEditRole = isTeamLeader(actor.role);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: member.full_name,
      phone: member.phone ?? "",
      role: member.role,
    },
  });

  async function onSubmit(values: MemberFormValues) {
    setLoading(true);
    const supabase = createClient();

    const payload: { full_name: string; phone: string | null; role?: UserRole } = {
      full_name: values.full_name,
      phone: values.phone || null,
    };
    if (canEditRole) {
      payload.role = values.role;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", member.id)
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Team member updated");
    setOpen(false);
    onSuccess?.(data);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit team member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-member-name">Full name</Label>
            <Input id="edit-member-name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-member-phone">Phone</Label>
            <Input id="edit-member-phone" type="tel" {...register("phone")} />
          </div>
          {canEditRole && (
            <div className="space-y-2">
              <Label>Role</Label>
              <Controller
                name="role"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
