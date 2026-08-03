"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Audience = "team" | "client";

// The toggle only changes framing copy — which portal a signed-in user lands
// on is decided by their actual profiles.role after auth, not by what they
// click here, so there's nothing to branch on before submit.
export function InlineSignIn() {
  const router = useRouter();
  const [audience, setAudience] = useState<Audience>("team");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }

    let isClient = false;
    if (data.user) {
      const [{ data: session }, { data: profile }] = await Promise.all([
        supabase.from("user_sessions").insert({ user_id: data.user.id }).select("id").single(),
        supabase.from("profiles").select("role").eq("id", data.user.id).single(),
      ]);
      if (session) sessionStorage.setItem("dyor_session_id", session.id);
      isClient = profile?.role === "client";
    }

    router.refresh();
    router.push(isClient ? "/portal" : "/clients");
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 flex gap-1 rounded-full border border-[#141414]/15 p-1">
        {(["team", "client"] as const).map((a) => (
          <button
            key={a}
            type="button"
            onClick={() => setAudience(a)}
            className={cn(
              "flex-1 rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition-colors",
              audience === a
                ? "bg-[#75a1dd] text-[#141414]"
                : "text-[#141414]/60 hover:text-[#141414]"
            )}
          >
            {a === "team" ? "Team" : "Client"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5 text-left">
          <Label htmlFor="signin-email" className="text-xs uppercase tracking-wide text-[#141414]/60">
            Email
          </Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border-[#141414]/20 bg-white text-[#141414] placeholder:text-[#141414]/30 focus-visible:border-[#141414]/50 focus-visible:ring-[#141414]/10"
          />
        </div>
        <div className="space-y-1.5 text-left">
          <Label htmlFor="signin-password" className="text-xs uppercase tracking-wide text-[#141414]/60">
            Password
          </Label>
          <div className="relative">
            <Input
              id="signin-password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="border-[#141414]/20 bg-white pr-10 text-[#141414] placeholder:text-[#141414]/30 focus-visible:border-[#141414]/50 focus-visible:ring-[#141414]/10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex items-center px-3 text-[#141414]/40 hover:text-[#141414]/70"
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-full bg-[#75a1dd] text-sm font-semibold tracking-wide text-[#141414] shadow-[0_8px_30px_rgba(117,161,221,0.35)] transition-all hover:-translate-y-0.5 hover:brightness-95 hover:shadow-[0_12px_40px_rgba(117,161,221,0.45)]"
        >
          {loading ? "Signing in…" : audience === "client" ? "Sign in as client" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
