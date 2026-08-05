"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { isTeamLeader } from "@/lib/auth/roles";
import { logActivity } from "@/lib/activity/log";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "__all__";
const UNANSWERED = "__unanswered__";

export type QuestionWithClient = Tables<"client_questions"> & {
  client: { id: string; name: string } | null;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function AnswerBox({
  question,
  onSaved,
}: {
  question: QuestionWithClient;
  onSaved: (row: Tables<"client_questions">) => void;
}) {
  const profile = useUser();
  const [value, setValue] = useState(question.answer ?? "");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!value.trim()) {
      toast.error("Write an answer first");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("client_questions")
      .update({ answer: value.trim(), answered_by: profile.id, answered_at: new Date().toISOString() })
      .eq("id", question.id)
      .select()
      .single();
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    logActivity(supabase, {
      actorId: profile.id,
      action: "question_answered",
      summary: `Answered: "${question.question}"`,
      entityType: "client_question",
      entityId: question.id,
    });

    toast.success("Answer sent");
    onSaved(data);
  }

  return (
    <div className="space-y-2">
      <Textarea
        rows={2}
        placeholder="Write a reply…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button size="sm" disabled={saving} onClick={submit}>
        {saving ? "Sending…" : question.answer ? "Update answer" : "Send answer"}
      </Button>
    </div>
  );
}

export function QuestionsBoard({
  initialQuestions,
  defaultClientId,
  showClientColumn = true,
}: {
  initialQuestions: QuestionWithClient[];
  defaultClientId?: string;
  showClientColumn?: boolean;
}) {
  const profile = useUser();
  const leader = isTeamLeader(profile.role);
  const [questions, setQuestions] = useState(initialQuestions);
  const [filter, setFilter] = useState<string>(UNANSWERED);

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      let query = supabase
        .from("client_questions")
        .select("*, client:clients(id, name)")
        .order("created_at", { ascending: false });
      if (defaultClientId) query = query.eq("client_id", defaultClientId);
      const { data } = await query;
      if (data) setQuestions(data as unknown as QuestionWithClient[]);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel(`client-questions-board-${defaultClientId ?? "all"}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "client_questions" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [defaultClientId]);

  async function handleDelete(question: QuestionWithClient) {
    if (!window.confirm(`Delete this question?`)) return;
    const supabase = createClient();
    const { error } = await supabase.from("client_questions").delete().eq("id", question.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setQuestions((prev) => prev.filter((q) => q.id !== question.id));
    toast.success("Question deleted");
  }

  const filtered = useMemo(() => {
    if (filter === UNANSWERED) return questions.filter((q) => !q.answer);
    return questions;
  }, [questions, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Questions</h1>
          <p className="text-sm text-muted-foreground">Questions clients have asked from the portal.</p>
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNANSWERED}>Unanswered</SelectItem>
            <SelectItem value={ALL}>All questions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === UNANSWERED ? "Nothing waiting on a reply." : "No questions yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-3 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {showClientColumn && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {q.client?.name ?? "Unknown client"}
                      </p>
                    )}
                    <p className="text-sm font-medium">{q.question}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant={q.answer ? "default" : "secondary"}>
                      {q.answer ? "Answered" : "Awaiting reply"}
                    </Badge>
                    {leader && (
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(q)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
                <AnswerBox
                  question={q}
                  onSaved={(row) =>
                    setQuestions((prev) => prev.map((p) => (p.id === row.id ? { ...p, ...row } : p)))
                  }
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
