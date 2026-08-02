"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useUser, useRoles, useAddRole } from "@/components/providers/user-provider";
import { isMasterKeyUser } from "@/lib/auth/roles";
import type { Tables } from "@/lib/types/database.types";
import { RoleSelect } from "@/components/team/role-select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const memberSchema = z
  .object({
    full_name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email"),
    password: z.string().optional(),
    is_external: z.boolean(),
    role: z.string().min(1, "Role is required"),
  })
  .refine((v) => v.is_external || (v.password && v.password.length >= 8), {
    message: "Must be at least 8 characters",
    path: ["password"],
  });

type MemberFormValues = z.infer<typeof memberSchema>;

export function AddMemberDialog({
  onSuccess,
}: {
  onSuccess?: (member: Tables<"profiles">) => void;
}) {
  const profile = useUser();
  const roles = useRoles();
  const addRole = useAddRole();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    resolver: zodResolver(memberSchema),
    defaultValues: { full_name: "", email: "", password: "", is_external: false, role: undefined },
  });
  const isExternal = watch("is_external");

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

    toast.success(
      values.is_external
        ? `${values.full_name} added as an external team member`
        : `${values.full_name} can now sign in`
    );
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
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Checkbox
              id="member-is-external"
              checked={isExternal}
              onCheckedChange={(checked) =>
                setValue("is_external", checked === true, { shouldValidate: true })
              }
            />
            <div>
              <Label htmlFor="member-is-external" className="font-normal">
                External team member
              </Label>
              <p className="text-xs text-muted-foreground">
                No dashboard access or sign-in — just assignable to tasks, and visible on the
                Team page and in reports.
              </p>
            </div>
          </div>
          {!isExternal && (
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
          )}
          <div className="space-y-2">
            <Label>Role</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <RoleSelect
                  roles={roles}
                  value={field.value}
                  onChange={field.onChange}
                  onRoleCreated={addRole}
                  allowCreate
                />
              )}
            />
            {errors.role && <p className="text-sm text-destructive">{errors.role.message}</p>}
          </div>
          <p className="text-xs text-muted-foreground">
            {isExternal
              ? "No account access is created — they'll just show up as an external option when assigning tasks."
              : "They can sign in with this email and password right away, and change their password themselves afterward."}
          </p>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding…" : "Add member"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
