"use client";

import { useState } from "react";
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

export function WhitelabelInviteDialog() {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState("");
  const [creating, setCreating] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  async function handleGenerate() {
    setCreating(true);
    const res = await fetch("/api/whitelabel/invites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: label.trim() || null }),
    });
    const body = await res.json();
    setCreating(false);

    if (!res.ok) {
      toast.error(body.error ?? "Failed to create invite");
      return;
    }

    setInviteUrl(`${window.location.origin}/onboard/${body.invite.token}`);
  }

  async function handleCopy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    toast.success("Link copied");
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setLabel("");
      setInviteUrl(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          Create invite
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create white-label invite</DialogTitle>
        </DialogHeader>

        {inviteUrl ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Send this link to the business — it lets them fill out their own onboarding form.
              Expires in 14 days, single use.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} className="text-xs" />
              <Button type="button" onClick={handleCopy}>
                Copy
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-label">Label (optional)</Label>
              <Input
                id="invite-label"
                placeholder="e.g. prospect name"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
              />
            </div>
            <Button type="button" disabled={creating} onClick={handleGenerate} className="w-full">
              {creating ? "Generating…" : "Generate link"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
