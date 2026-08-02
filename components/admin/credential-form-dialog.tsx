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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const credentialSchema = z.object({
  platform: z.string().min(1, "Platform / app name is required"),
  login: z.string().min(1, "Login is required"),
  password: z.string().min(1, "Password is required"),
  auth_code: z.string().optional(),
});

type CredentialFormValues = z.infer<typeof credentialSchema>;

export function CredentialFormDialog({
  clientId,
  credential,
  trigger,
  onSuccess,
}: {
  clientId: string;
  credential?: Tables<"client_credentials">;
  trigger: React.ReactNode;
  onSuccess: (row: Tables<"client_credentials">) => void;
}) {
  const profile = useUser();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: {
      platform: credential?.platform ?? "",
      login: credential?.login ?? "",
      password: credential?.password ?? "",
      auth_code: credential?.auth_code ?? "",
    },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset({
        platform: credential?.platform ?? "",
        login: credential?.login ?? "",
        password: credential?.password ?? "",
        auth_code: credential?.auth_code ?? "",
      });
    }
  }

  async function onSubmit(values: CredentialFormValues) {
    setLoading(true);
    const supabase = createClient();

    const payload = {
      client_id: clientId,
      platform: values.platform,
      login: values.login,
      password: values.password,
      auth_code: values.auth_code || null,
    };

    const result = credential
      ? await supabase
          .from("client_credentials")
          .update(payload)
          .eq("id", credential.id)
          .select()
          .single()
      : await supabase
          .from("client_credentials")
          .insert({ ...payload, created_by: profile.id })
          .select()
          .single();

    setLoading(false);

    if (result.error) {
      toast.error(result.error.message);
      return;
    }

    toast.success(credential ? "Login updated" : "Login added");
    setOpen(false);
    onSuccess(result.data);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{credential ? "Edit login" : "Add login"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cred-platform">Platform / app name</Label>
            <Input id="cred-platform" placeholder="Instagram, Meta Business Suite…" {...register("platform")} />
            {errors.platform && (
              <p className="text-sm text-destructive">{errors.platform.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-login">Login / email</Label>
            <Input id="cred-login" {...register("login")} />
            {errors.login && <p className="text-sm text-destructive">{errors.login.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-password">Password</Label>
            <Input id="cred-password" {...register("password")} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-auth-code">Authentication number (optional)</Label>
            <Input id="cred-auth-code" placeholder="2FA code, PIN…" {...register("auth_code")} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : credential ? "Save changes" : "Add login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
