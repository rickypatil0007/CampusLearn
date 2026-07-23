"use client";
import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

const TYPES = [
  { value: "quick_summary", label: "Quick summary" },
  { value: "detailed_summary", label: "Detailed summary" },
  { value: "important_points", label: "Important points" },
  { value: "key_definitions", label: "Key definitions" },
  { value: "formula_list", label: "Formula list" },
  { value: "revision_notes", label: "Exam revision notes" },
  { value: "flashcards", label: "Flashcards" },
];

export function SummarizePanel({ resourceId }: { resourceId: string }) {
  const [type, setType] = useState("quick_summary");
  const [output, setOutput] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function generate() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/summarize", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resourceId, summaryType: type }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not generate summary.");
        setOutput(json.output.text);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not generate summary.");
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
          <SelectContent>{TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
        </Select>
        <Button onClick={generate} disabled={isPending}><Sparkles className="h-4 w-4" /> {isPending ? "Generating…" : "Generate"}</Button>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      {output && (
        <Card>
          <CardContent className="space-y-2 p-4 text-sm">
            <p className="whitespace-pre-wrap text-foreground">{output}</p>
            <p className="text-xs text-muted-foreground">AI-generated — verify against the original resource before relying on it for exams.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
