import { createClient } from "@/lib/supabase/server";
import { QuestionsBoard, type QuestionWithClient } from "@/components/questions/questions-board";

export default async function QuestionsPage() {
  const supabase = await createClient();

  const { data: questions } = await supabase
    .from("client_questions")
    .select("*, client:clients(id, name)")
    .order("created_at", { ascending: false });

  return <QuestionsBoard initialQuestions={(questions ?? []) as unknown as QuestionWithClient[]} />;
}
