"use client";
import { useState, useTransition } from "react";
import { Sparkles, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Citation { resourceId: string; resourceTitle: string; sectionReference: string | null }
interface Message { role: "user" | "assistant"; content: string; citations?: Citation[]; grounded?: boolean }

export function AssistantChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function ask() {
    if (!input.trim()) return;
    const question = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Something went wrong.");
        setMessages((prev) => [...prev, { role: "assistant", content: json.answer, citations: json.citations, grounded: json.grounded }]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "The AI assistant is unavailable.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Ask about any topic covered in your approved resources.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "max-w-[85%] rounded-lg border border-border bg-elevated px-3 py-2 text-sm text-foreground"}>
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.citations && m.citations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {m.citations.map((c, j) => <Badge key={j} variant="outline">{c.resourceTitle}{c.sectionReference ? ` · ${c.sectionReference}` : ""}</Badge>)}
              </div>
            )}
          </div>
        ))}
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <div className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about your subjects…"
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(); } }}
        />
        <Button onClick={ask} disabled={isPending || !input.trim()}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}
