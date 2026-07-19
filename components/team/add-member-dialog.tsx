"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser, ROLES } from "@/lib/auth/roles";
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
  password: z.string().min(8, "Must be at least 8 characters"),
  role: z.enum([
    "team_leader",
    "editor_designer",
    "videographer_photographer",
    "social_media_manager",
  ]),
});

type MemberFormValues = z.infer<typeof memberSchema>;

export function AddMemberDialog({
  onSuccess,
}: {
  onSuccess?: (member: Tables<"profiles">) => void;
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
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { full_name: "", email: "", password: "", role: undefined },
  });

  if (!isMasterKeyUser(profile.email)) {
    return null;
  }

  async function onSubmit(values: MemberFormValues) {
    setLoading(true);
    const res = await fetch("/api/team/create-member", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to add team member");
      return;
    }

    toast.success(`${values.full_name} can now sign in`);
    if (body.profile) onSuccess?.(body.profile);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add team member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add team member</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="member-name">Full name</Label>
            <Input id="member-name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-email">Email</Label>
            <Input id="member-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="member-password">Password</Label>
            <Input
              id="member-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select role" />
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
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            They can sign in with this email and password right away, and change their password
            themselves afterward.
          </p>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding…" : "Add member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
