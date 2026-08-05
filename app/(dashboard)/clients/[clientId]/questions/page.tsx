import { createClient } from "@/lib/supabase/server";
import { QuestionsBoard, type QuestionWithClient } from "@/components/questions/questions-board";

export default async function ClientQuestionsPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("client_questions")
    .select("*, client:clients(id, name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return (
    <QuestionsBoard
      initialQuestions={(questions ?? []) as unknown as QuestionWithClient[]}
      defaultClientId={clientId}
      showClientColumn={false}
    />
  );
}
