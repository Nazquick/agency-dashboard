"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Pencil, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CredentialFormDialog } from "@/components/admin/credential-form-dialog";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function CredentialField({
  label,
  value,
  masked,
}: {
  label: string;
  value: string;
  masked: boolean;
}) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy — copy it manually");
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-muted-foreground">
        {label}: <span className="text-foreground">{masked ? "••••••••" : value}</span>
      </span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6 shrink-0"
        onClick={copy}
        aria-label={`Copy ${label}`}
      >
        <Copy className="size-3" />
      </Button>
    </div>
  );
}

export function ClientCredentialsPanel({
  clients,
  initialCredentials,
}: {
  clients: Pick<Tables<"clients">, "id" | "name">[];
  initialCredentials: Tables<"client_credentials">[];
}) {
  const [credentials, setCredentials] = useState(initialCredentials);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  function toggleReveal(id: string) {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete(credentialId: string) {
    if (!window.confirm("Delete this login? This can't be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("client_credentials").delete().eq("id", credentialId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setCredentials((prev) => prev.filter((c) => c.id !== credentialId));
    toast.success("Login deleted");
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {clients.map((client) => {
        const clientCredentials = credentials.filter((c) => c.client_id === client.id);
        return (
          <Card key={client.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">{client.name}</h3>
                <CredentialFormDialog
                  clientId={client.id}
                  trigger={
                    <Button type="button" variant="outline" size="sm">
                      <Plus className="size-3.5" /> Add login
                    </Button>
                  }
                  onSuccess={(row) => setCredentials((prev) => [...prev, row])}
                />
              </div>

              {clientCredentials.length === 0 ? (
                <p className="text-xs text-muted-foreground">No logins saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {clientCredentials.map((cred) => {
                    const revealed = revealedIds.has(cred.id);
                    return (
                      <div key={cred.id} className="space-y-1.5 rounded-md border p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">{cred.platform}</span>
                          <div className="flex shrink-0 items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => toggleReveal(cred.id)}
                              aria-label={revealed ? "Hide password" : "Reveal password"}
                            >
                              {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                            </Button>
                            <CredentialFormDialog
                              clientId={client.id}
                              credential={cred}
                              trigger={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  aria-label="Edit login"
                                >
                                  <Pencil className="size-3.5" />
                                </Button>
                              }
                              onSuccess={(row) =>
                                setCredentials((prev) =>
                                  prev.map((c) => (c.id === row.id ? row : c))
                                )
                              }
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6"
                              onClick={() => handleDelete(cred.id)}
                              aria-label="Delete login"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                        <CredentialField label="Login" value={cred.login} masked={false} />
                        <CredentialField label="Password" value={cred.password} masked={!revealed} />
                        {cred.auth_code && (
                          <CredentialField label="Auth code" value={cred.auth_code} masked={!revealed} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
