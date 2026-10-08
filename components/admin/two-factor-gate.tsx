"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Phase =
  | { kind: "loading" }
  | { kind: "verify"; factorId: string }
  | { kind: "setup"; factorId: string; qrCode: string; secret: string }
  | { kind: "ready" }
  | { kind: "error"; message: string };

// Client logins are only readable in a session that has passed a TOTP check
// (JWT aal2). The database enforces this too (is_admin_with_mfa); this gate
// just walks the admin through enrolling an authenticator app or entering
// the current code.
export function TwoFactorGate({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function startEnrollment(stale: { id: string }[]) {
    const supabase = createClient();
    // An abandoned earlier setup leaves an unverified factor behind.
    for (const factor of stale) await supabase.auth.mfa.unenroll({ factorId: factor.id });
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: `DYOR admin ${Date.now()}`,
    });
    if (error || !data) {
      setPhase({ kind: "error", message: error?.message ?? "Couldn't start two-factor setup." });
      return;
    }
    setPhase({ kind: "setup", factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  }

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const supabase = createClient();
      const { data: aal, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (cancelled) return;
      if (error || !aal) {
        setPhase({ kind: "error", message: error?.message ?? "Couldn't check two-factor status." });
        return;
      }
      if (aal.currentLevel === "aal2") {
        setPhase({ kind: "ready" });
        return;
      }
      const { data: factors } = await supabase.auth.mfa.listFactors();
      if (cancelled) return;
      const verified = factors?.totp?.[0];
      if (verified) {
        setPhase({ kind: "verify", factorId: verified.id });
        return;
      }
      const stale = (factors?.all ?? []).filter((f) => f.factor_type === "totp" && f.status === "unverified");
      await startEnrollment(stale);
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(factorId: string) {
    setBusy(true);
    const supabase = createClient();
    const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
    if (challengeError || !challenge) {
      setBusy(false);
      toast.error(challengeError?.message ?? "Couldn't start the check");
      return;
    }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code: code.trim() });
    setBusy(false);
    if (error) {
      toast.error("That code didn't work — check your authenticator app and try again.");
      return;
    }
    setCode("");
    setPhase({ kind: "ready" });
  }

  if (phase.kind === "ready") return <>{children}</>;

  if (phase.kind === "loading") {
    return <p className="text-sm text-muted-foreground">Checking two-factor status…</p>;
  }

  if (phase.kind === "error") {
    return (
      <p className="text-sm text-destructive">
        {phase.message} Two-factor authentication must be enabled for this project in Supabase
        (Authentication → Multi-Factor).
      </p>
    );
  }

  const factorId = phase.factorId;
  return (
    <form
      className="mx-auto max-w-sm space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit(factorId);
      }}
    >
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-primary" />
        <h3 className="text-sm font-semibold">
          {phase.kind === "setup" ? "Set up two-factor authentication" : "Confirm it's you"}
        </h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Client passwords are encrypted and only open after a two-factor check.
        {phase.kind === "setup"
          ? " Scan this code with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows."
          : " Enter the 6-digit code from your authenticator app."}
      </p>
      {phase.kind === "setup" && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={phase.qrCode} alt="Two-factor setup QR code" className="mx-auto size-44 rounded-md bg-white p-2" />
          <p className="break-all text-center font-mono text-xs text-muted-foreground">{phase.secret}</p>
        </div>
      )}
      <Input
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
        aria-label="6-digit code"
      />
      <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
        {busy ? "Checking…" : phase.kind === "setup" ? "Turn on two-factor" : "Verify"}
      </Button>
    </form>
  );
}
