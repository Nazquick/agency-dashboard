"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { Tables } from "@/lib/types/database.types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_LABEL: Record<string, string> = {
  provisioning: "Provisioning",
  seeded: "Seeded",
  live: "Live",
  failed: "Failed",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function TenantRow({ tenant }: { tenant: Tables<"whitelabel_tenants"> }) {
  const [appUrl, setAppUrl] = useState(tenant.app_url ?? "");
  const [notes, setNotes] = useState(tenant.notes ?? "");
  const [status, setStatus] = useState(tenant.status);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/whitelabel/tenants/${tenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ app_url: appUrl || null, notes: notes || null, status }),
    });
    const body = await res.json();
    setSaving(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to save");
      return;
    }
    toast.success("Saved");
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-medium">{tenant.business_name}</p>
          <p className="text-xs text-muted-foreground">
            {tenant.contact_email} · {tenant.layout_variant} · created {formatDate(tenant.created_at)}
          </p>
          {tenant.path_slug && (
            <p className="text-xs text-muted-foreground">
              dyor.studio/{tenant.path_slug}
              {tenant.status !== "live" && " (not yet activated — set status to Live once the deploy is confirmed)"}
            </p>
          )}
        </div>
        <Badge variant={status === "live" ? "default" : "secondary"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Live URL</label>
          <Input
            placeholder="https://client.vercel.app"
            value={appUrl}
            onChange={(e) => setAppUrl(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STATUS_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Notes</label>
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. domain still pending DNS"
        />
      </div>

      <Button size="sm" variant="outline" disabled={saving} onClick={handleSave}>
        {saving ? "Saving…" : "Save"}
      </Button>
    </div>
  );
}

function InviteRow({
  invite,
  onRevoked,
}: {
  invite: Tables<"whitelabel_invites">;
  onRevoked: (id: string) => void;
}) {
  const [revoking, setRevoking] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(`${window.location.origin}/onboard/${invite.token}`);
    toast.success("Link copied");
  }

  async function handleRevoke() {
    if (!window.confirm("Revoke this invite? The link will stop working.")) return;
    setRevoking(true);
    const res = await fetch(`/api/whitelabel/invites/${invite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "revoked" }),
    });
    const body = await res.json();
    setRevoking(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to revoke");
      return;
    }
    onRevoked(invite.id);
    toast.success("Invite revoked");
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3">
      <div>
        <p className="text-sm font-medium">{invite.label || "Untitled invite"}</p>
        <p className="text-xs text-muted-foreground">
          Created {formatDate(invite.created_at)} · expires {formatDate(invite.expires_at)}
        </p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={handleCopy}>
          Copy link
        </Button>
        <Button size="sm" variant="ghost" disabled={revoking} onClick={handleRevoke}>
          Revoke
        </Button>
      </div>
    </div>
  );
}

export function WhitelabelTenantsPanel({
  tenants,
  invites,
}: {
  tenants: Tables<"whitelabel_tenants">[];
  invites: Tables<"whitelabel_invites">[];
}) {
  const [pendingInvites, setPendingInvites] = useState(
    invites.filter((i) => i.status === "pending")
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Pending invites ({pendingInvites.length})</h3>
        {pendingInvites.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending invites.</p>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <InviteRow
                key={invite.id}
                invite={invite}
                onRevoked={(id) => setPendingInvites((prev) => prev.filter((i) => i.id !== id))}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Tenants ({tenants.length})</h3>
        {tenants.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dashboards handed out yet.</p>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <TenantRow key={tenant.id} tenant={tenant} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
