"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
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

const loginSchema = z.object({
  full_name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Must be at least 8 characters"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function CreateMasterLoginDialog({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { full_name: "", email: "", password: "" },
  });

  async function onSubmit(values: LoginFormValues) {
    setLoading(true);
    const res = await fetch(`/api/client-groups/${groupId}/create-master-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();
    setLoading(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to create master login");
      return;
    }

    toast.success(`${values.full_name} can now sign in as ${groupName}'s master account`);
    reset();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create master login
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create {groupName} master login</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-login-name">Contact name</Label>
            <Input id="master-login-name" {...register("full_name")} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="master-login-email">Email</Label>
            <Input id="master-login-email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="master-login-password">Password</Label>
            <Input
              id="master-login-password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            They can sign in with this email and password right away, scoped to every location in
            {" "}{groupName}&apos;s pipeline, calendar, and analytics.
          </p>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating…" : "Create master login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
