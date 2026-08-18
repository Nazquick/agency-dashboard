import { AssistantChat } from "@/components/assistant/assistant-chat";

export default function AssistantPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Live from the dashboard — tasks, deadlines, client activity, and campaigns.
        </p>
      </div>

      <AssistantChat />
    </div>
  );
}
