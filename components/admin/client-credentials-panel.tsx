"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Copy, Pencil, Trash2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CredentialFormDialog, type CredentialRow } from "@/components/admin/credential-form-dialog";
import { TwoFactorGate } from "@/components/admin/two-factor-gate";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Field = "password" | "auth_code";

// A revealed secret stays on screen briefly, then is dropped from memory.
const REVEAL_MS = 30_000;

const CREDENTIAL_COLUMNS = "id, client_id, platform, login, auth_code_secret_id, created_at, updated_at";

async function revealSecret(credentialId: string, field: Field): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("reveal_client_credential", {
    p_id: credentialId,
    p_field: field,
  });
  if (error) throw new Error(error.message);
  return data;
}

function SecretRow({
  label,
  credentialId,
  field,
  revealed,
  onReveal,
  onHide,
}: {
  label: string;
  credentialId: string;
  field: Field;
  revealed: string | undefined;
  onReveal: () => void;
  onHide: () => void;
}) {
  async function copy() {
    try {
      // Copy straight from the (logged) reveal call without putting the
      // secret on screen. The clipboard promise keeps the click's user
      // gesture valid across the network round trip.
      const text = revealed !== undefined ? Promise.resolve(revealed) : revealSecret(credentialId, field);
      await navigator.clipboard.write([
        new ClipboardItem({ "text/plain": text.then((t) => new Blob([t ?? ""], { type: "text/plain" })) }),
      ]);
      toast.success(`${label} copied`);
    } catch {
      toast.error("Couldn't copy — reveal it and copy manually");
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-muted-foreground">
        {label}: <span className="text-foreground">{revealed !== undefined ? revealed : "••••••••"}</span>
      </span>
      <div className="flex shrink-0 items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6"
          onClick={revealed !== undefined ? onHide : onReveal}
          aria-label={revealed !== undefined ? `Hide ${label}` : `Reveal ${label}`}
        >
          {revealed !== undefined ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
        </Button>
        <Button type="button" variant="ghost" size="icon" className="size-6" onClick={copy} aria-label={`Copy ${label}`}>
          <Copy className="size-3" />
        </Button>
      </div>
    </div>
  );
}

function CredentialsList({ clients }: { clients: Pick<Tables<"clients">, "id" | "name">[] }) {
  const [credentials, setCredentials] = useState<CredentialRow[] | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("client_credentials")
      .select(CREDENTIAL_COLUMNS)
      .order("platform")
      .then(({ data, error }) => {
        if (error) toast.error(error.message);
        setCredentials(data ?? []);
      });
    const pending = timers.current;
    return () => {
      Object.values(pending).forEach(clearTimeout);
    };
  }, []);

  function hide(key: string) {
    clearTimeout(timers.current[key]);
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function reveal(credentialId: string, field: Field) {
    const key = `${credentialId}:${field}`;
    try {
      const value = await revealSecret(credentialId, field);
      setRevealed((prev) => ({ ...prev, [key]: value ?? "" }));
      clearTimeout(timers.current[key]);
      timers.current[key] = setTimeout(() => hide(key), REVEAL_MS);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't reveal this");
    }
  }

  async function handleDelete(credentialId: string) {
    if (!window.confirm("Delete this login? This can't be undone.")) return;
    const supabase = createClient();
    const { error } = await supabase.from("client_credentials").delete().eq("id", credentialId);
    if (error) {
      toast.error(error.message);
      return;
    }
    hide(`${credentialId}:password`);
    hide(`${credentialId}:auth_code`);
    setCredentials((prev) => (prev ?? []).filter((c) => c.id !== credentialId));
    toast.success("Login deleted");
  }

  if (credentials === null) {
    return <p className="text-sm text-muted-foreground">Loading logins…</p>;
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
                  onSuccess={(row) => setCredentials((prev) => [...(prev ?? []), row])}
                />
              </div>

              {clientCredentials.length === 0 ? (
                <p className="text-xs text-muted-foreground">No logins saved yet.</p>
              ) : (
                <div className="space-y-2">
                  {clientCredentials.map((cred) => (
                    <div key={cred.id} className="space-y-1.5 rounded-md border p-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{cred.platform}</span>
                        <div className="flex shrink-0 items-center gap-1">
                          <CredentialFormDialog
                            clientId={client.id}
                            credential={cred}
                            trigger={
                              <Button type="button" variant="ghost" size="icon" className="size-6" aria-label="Edit login">
                                <Pencil className="size-3.5" />
                              </Button>
                            }
                            onSuccess={(row) =>
                              setCredentials((prev) => (prev ?? []).map((c) => (c.id === row.id ? row : c)))
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
                      <p className="truncate text-xs text-muted-foreground">
                        Login: <span className="text-foreground">{cred.login}</span>
                      </p>
                      <SecretRow
                        label="Password"
                        credentialId={cred.id}
                        field="password"
                        revealed={revealed[`${cred.id}:password`]}
                        onReveal={() => reveal(cred.id, "password")}
                        onHide={() => hide(`${cred.id}:password`)}
                      />
                      {cred.auth_code_secret_id && (
                        <SecretRow
                          label="Auth code"
                          credentialId={cred.id}
                          field="auth_code"
                          revealed={revealed[`${cred.id}:auth_code`]}
                          onReveal={() => reveal(cred.id, "auth_code")}
                          onHide={() => hide(`${cred.id}:auth_code`)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ClientCredentialsPanel({ clients }: { clients: Pick<Tables<"clients">, "id" | "name">[] }) {
  return (
    <TwoFactorGate>
      <CredentialsList clients={clients} />
    </TwoFactorGate>
  );
}
