"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/components/providers/user-provider";
import { isMasterKeyUser } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What's due this week?",
  "What campaigns are currently active?",
  "Who should I loop in on a campaign for one of our clients?",
];

export function AssistantChat() {
  const profile = useUser();
  const isAdmin = isMasterKeyUser(profile.email);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(question: string) {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    const history = messages;
    setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: trimmed, history }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Something went wrong");
      setMessages((prev) => prev.slice(0, -1));
      return;
    }

    const { answer } = (await res.json()) as { answer: string };
    setMessages((prev) => [...prev, { role: "assistant", content: answer }]);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-220px)] min-h-[420px] flex-col rounded-lg border bg-card">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Hi {profile.full_name.split(" ")[0]} — ask me anything about what&apos;s going on right
              now: tasks, deadlines, campaigns, or clients.
              {isAdmin &&
                " Tell me anything worth remembering and I'll carry it into every future conversation with the team."}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[80%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">Thinking…</div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a task, deadline, or campaign…"
          rows={1}
          className="min-h-0 flex-1 resize-none"
        />
        <Button size="icon" disabled={loading || !input.trim()} onClick={() => send(input)}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
