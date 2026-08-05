"use client";

import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { createRealtimeClient } from "@/lib/supabase/realtime-client";
import { useUser } from "@/components/providers/user-provider";
import { logActivity } from "@/lib/activity/log";
import type { Tables } from "@/lib/types/database.types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

const askSchema = z.object({
  client_id: z.string().optional(),
  question: z.string().min(1, "Question is required"),
});

type AskFormValues = z.infer<typeof askSchema>;

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function ClientQuestionsPanel({
  clients,
  initialQuestions,
}: {
  clients: { id: string; name: string }[];
  initialQuestions: Tables<"client_questions">[];
}) {
  const profile = useUser();
  const [questions, setQuestions] = useState(initialQuestions);
  const [loading, setLoading] = useState(false);
  const showLocation = clients.length > 1;

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AskFormValues>({
    resolver: zodResolver(askSchema),
    defaultValues: {
      client_id: clients.length === 1 ? clients[0].id : undefined,
      question: "",
    },
  });

  useEffect(() => {
    let supabase: SupabaseClient;
    let channel: ReturnType<SupabaseClient["channel"]>;
    let cancelled = false;

    async function refetch() {
      const { data } = await supabase
        .from("client_questions")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setQuestions(data);
    }

    async function setup() {
      supabase = await createRealtimeClient();
      if (cancelled) return;
      channel = supabase
        .channel("client-questions-portal")
        .on("postgres_changes", { event: "*", schema: "public", table: "client_questions" }, refetch)
        .subscribe();
    }

    setup();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  async function onSubmit(values: AskFormValues) {
    const clientId = values.client_id ?? clients[0]?.id;
    if (!clientId) {
      toast.error("Choose a location");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("client_questions")
      .insert({ client_id: clientId, question: values.question, asked_by: profile.id })
      .select()
      .single();

    setLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    logActivity(supabase, {
      actorId: profile.id,
      action: "question_asked",
      summary: `Asked: "${values.question}"`,
      entityType: "client_question",
      entityId: data.id,
    });

    setQuestions((prev) => [data, ...prev]);
    toast.success("Sent to the team");
    reset({ client_id: clients.length === 1 ? clients[0].id : undefined, question: "" });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Questions</h1>
        <p className="text-sm text-muted-foreground">
          Ask the team anything — they&apos;ll reply here.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {showLocation && (
              <div className="space-y-2">
                <Label>Location</Label>
                <Controller
                  name="client_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select location" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="question-text">Your question</Label>
              <Textarea id="question-text" rows={3} {...register("question")} />
              {errors.question && (
                <p className="text-sm text-destructive">{errors.question.message}</p>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Sending…" : "Ask"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {questions.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">No questions yet.</p>
      ) : (
        <div className="space-y-3">
          {questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-2 pt-6">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">{q.question}</p>
                  <Badge variant={q.answer ? "default" : "secondary"} className="shrink-0">
                    {q.answer ? "Answered" : "Awaiting reply"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(q.created_at)}</p>
                {q.answer && (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="text-sm">{q.answer}</p>
                    {q.answered_at && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Answered {formatDate(q.answered_at)}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
