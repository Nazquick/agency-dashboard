"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
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

// What the browser ever holds for a saved login: no secrets, only whether an
// auth code exists. Secrets stay in Vault until explicitly revealed.
export type CredentialRow = Pick<
  Tables<"client_credentials">,
  "id" | "client_id" | "platform" | "login" | "auth_code_secret_id" | "created_at" | "updated_at"
>;

const credentialSchema = z.object({
  platform: z.string().min(1, "Platform / app name is required"),
  login: z.string().min(1, "Login is required"),
  password: z.string().optional(),
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
  credential?: CredentialRow;
  trigger: React.ReactNode;
  onSuccess: (row: CredentialRow) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [removeAuthCode, setRemoveAuthCode] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialSchema),
    defaultValues: { platform: credential?.platform ?? "", login: credential?.login ?? "", password: "", auth_code: "" },
  });

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      reset({ platform: credential?.platform ?? "", login: credential?.login ?? "", password: "", auth_code: "" });
      setRemoveAuthCode(false);
    }
  }

  async function onSubmit(values: CredentialFormValues) {
    if (!credential && !values.password) {
      setError("password", { message: "Password is required" });
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.rpc("save_client_credential", {
      // A new login has no id; the RPC treats null as "create".
      p_id: credential?.id ?? (null as unknown as string),
      p_client_id: clientId,
      p_platform: values.platform,
      p_login: values.login,
      p_password: values.password ?? "",
      p_auth_code: values.auth_code ?? "",
      p_remove_auth_code: removeAuthCode,
    });
    setLoading(false);

    if (error || !data) {
      toast.error(error?.message ?? "Couldn't save this login");
      return;
    }

    toast.success(credential ? "Login updated" : "Login added");
    setOpen(false);
    onSuccess(data);
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
            {errors.platform && <p className="text-sm text-destructive">{errors.platform.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-login">Login / email</Label>
            <Input id="cred-login" autoComplete="off" {...register("login")} />
            {errors.login && <p className="text-sm text-destructive">{errors.login.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-password">Password</Label>
            <Input
              id="cred-password"
              type="password"
              autoComplete="new-password"
              placeholder={credential ? "Leave blank to keep the current password" : undefined}
              {...register("password")}
            />
            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="cred-auth-code">Authentication number (optional)</Label>
            <Input
              id="cred-auth-code"
              type="password"
              autoComplete="off"
              placeholder={
                credential?.auth_code_secret_id ? "Leave blank to keep the current one" : "2FA code, PIN…"
              }
              {...register("auth_code")}
            />
            {credential?.auth_code_secret_id && (
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={removeAuthCode}
                  onChange={(e) => setRemoveAuthCode(e.target.checked)}
                />
                Remove the saved authentication number
              </label>
            )}
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Saving…" : credential ? "Save changes" : "Add login"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
