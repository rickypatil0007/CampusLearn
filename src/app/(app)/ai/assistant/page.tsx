import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { AssistantChat } from "./assistant-chat";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "AI Assistant" };

export default async function AiAssistantPage() {
  await requireUserOrRedirect();
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">Ask questions grounded in your approved CampusLearn resources, with citations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Grounded Q&amp;A</CardTitle>
          <CardDescription>
            Answers are generated only from resources you have access to. Requires an administrator to configure
            ANTHROPIC_API_KEY and an embedding provider — see the setup guide.
          </CardDescription>
        </CardHeader>
        <CardContent><AssistantChat /></CardContent>
      </Card>
    </div>
  );
}
