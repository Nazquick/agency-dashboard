"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser, isTeamLeader, ROLES, type UserRole } from "@/lib/auth/roles";
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
  email: z.string().email("Invalid email"),
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
  onRemoved,
}: {
  member: Tables<"profiles">;
  trigger: React.ReactNode;
  onSuccess?: (member: Tables<"profiles">) => void;
  onRemoved?: (memberId: string) => void;
}) {
  const actor = useUser();
  const canEditRole = isTeamLeader(actor.role);
  const canEditEmail = isMasterKeyUser(actor.email);
  const canRemove = isMasterKeyUser(actor.email) && actor.id !== member.id;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: {
      full_name: member.full_name,
      email: member.email,
      phone: member.phone ?? "",
      role: member.role,
    },
  });

  async function onSubmit(values: MemberFormValues) {
    setLoading(true);
    const supabase = createClient();

    if (canEditEmail && values.email !== member.email) {
      const res = await fetch(`/api/team/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: values.email }),
      });
      const body = await res.json();
      if (!res.ok) {
        setLoading(false);
        toast.error(body.error ?? "Failed to update email");
        return;
      }
    }

    const promotingToLeader =
      canEditRole && values.role === "team_leader" && member.role !== "team_leader";
    const needsApproval = promotingToLeader && !isMasterKeyUser(actor.email);

    const payload: { full_name: string; phone: string | null; role?: UserRole } = {
      full_name: values.full_name,
      phone: values.phone || null,
    };
    if (canEditRole && !needsApproval) {
      payload.role = values.role;
    }

    const { data, error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", member.id)
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (needsApproval) {
      const { error: requestError } = await supabase.from("role_change_requests").insert({
        target_user_id: member.id,
        requested_role: "team_leader",
        requested_by: actor.id,
      });
      setLoading(false);

      if (requestError) {
        toast.error(
          requestError.code === "23505"
            ? "A promotion request is already pending for this member"
            : requestError.message
        );
        return;
      }

      toast.success("Team member updated. Promotion sent to nasir@thequickstyle.com for approval.");
      setOpen(false);
      onSuccess?.(data);
      return;
    }

    setLoading(false);
    toast.success("Team member updated");
    setOpen(false);
    onSuccess?.(data);
  }

  async function handleRemove() {
    if (!window.confirm(`Remove ${member.full_name}? They will no longer be able to sign in.`)) {
      return;
    }
    setRemoving(true);
    const res = await fetch(`/api/team/${member.id}`, { method: "DELETE" });
    const body = await res.json();
    setRemoving(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to remove team member");
      return;
    }

    toast.success(`${member.full_name} removed`);
    setOpen(false);
    onRemoved?.(member.id);
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
            <Label htmlFor="edit-member-email">Email</Label>
            <Input
              id="edit-member-email"
              type="email"
              disabled={!canEditEmail}
              {...register("email")}
            />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            {!canEditEmail && (
              <p className="text-xs text-muted-foreground">
                Only nasir@thequickstyle.com can change a member&apos;s email.
              </p>
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
          {canRemove && (
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={removing}
              onClick={handleRemove}
            >
              {removing ? "Removing…" : "Remove member"}
            </Button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
