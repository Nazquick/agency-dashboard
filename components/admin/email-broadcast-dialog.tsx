"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EmailBroadcastDialog({ audience }: { audience: "clients" | "members" }) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadCount() {
      const supabase = createClient();
      if (audience === "clients") {
        const { data } = await supabase
          .from("client_contacts")
          .select("client_id, email")
          .not("email", "is", null);
        if (cancelled) return;
        setRecipientCount(new Set((data ?? []).map((c) => c.client_id)).size);
      } else {
        const { data } = await supabase.from("profiles").select("id").neq("role", "client");
        if (cancelled) return;
        setRecipientCount((data ?? []).length);
      }
    }
    loadCount();
    return () => {
      cancelled = true;
    };
  }, [audience]);

  async function handleSend() {
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    setSending(true);
    const res = await fetch(`/api/admin/email-${audience}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, body }),
    });
    const result = await res.json();
    setSending(false);

    if (!res.ok) {
      toast.error(result.error ?? "Failed to send email");
      return;
    }

    toast.success(`Sent to ${result.recipientCount} ${audience}`);
    setSubject("");
    setBody("");
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`broadcast-subject-${audience}`}>Subject</Label>
        <Input
          id={`broadcast-subject-${audience}`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`broadcast-body-${audience}`}>Message</Label>
        <Textarea
          id={`broadcast-body-${audience}`}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        disabled={sending || recipientCount === null || recipientCount === 0}
        onClick={handleSend}
      >
        {sending
          ? "Sending…"
          : recipientCount === null
            ? "Loading recipients…"
            : `Send to ${recipientCount} ${audience}`}
      </Button>
      {recipientCount === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          No {audience} with an email address on file yet.
        </p>
      )}
    </div>
  );
}
