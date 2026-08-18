import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask about any campaign — status, channels, timing, or who to loop in.
        </p>
      </div>

      <AssistantChat />
    </div>
  );
}
