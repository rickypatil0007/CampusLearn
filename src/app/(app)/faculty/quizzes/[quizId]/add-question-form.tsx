"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addQuestionAction } from "../../../quizzes/_actions";

type QType = "mcq_single" | "mcq_multiple" | "true_false" | "short_answer";

export function AddQuestionForm({ quizId }: { quizId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [questionType, setQuestionType] = useState<QType>("mcq_single");
  const [prompt, setPrompt] = useState("");
  const [marks, setMarks] = useState(1);
  const [options, setOptions] = useState<{ text: string; isCorrect: boolean }[]>([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);

  function reset() {
    setPrompt(""); setMarks(1); setOptions([{ text: "", isCorrect: true }, { text: "", isCorrect: false }]);
  }

  function submit() {
    const opts = questionType === "true_false" ? [{ text: "True", isCorrect: options[0]?.isCorrect ?? true }, { text: "False", isCorrect: !(options[0]?.isCorrect ?? true) }] : options.filter((o) => o.text.trim());
    startTransition(async () => {
      const result = await addQuestionAction({
        quizId, questionType, prompt, marks,
        options: questionType === "short_answer" ? undefined : opts,
      });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Question added.");
      reset();
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <Label>Question type</Label>
        <Select value={questionType} onValueChange={(v) => setQuestionType(v as QType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="mcq_single">Multiple choice (single answer)</SelectItem>
            <SelectItem value="mcq_multiple">Multiple choice (multiple answers)</SelectItem>
            <SelectItem value="true_false">True / False</SelectItem>
            <SelectItem value="short_answer">Short answer (manual review)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Prompt</Label>
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="What is…?" />
      </div>

      <div className="w-32">
        <Label>Marks</Label>
        <Input type="number" min={0.5} step={0.5} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
      </div>

      {questionType === "true_false" && (
        <div>
          <Label>Correct answer</Label>
          <Select value={options[0]?.isCorrect ? "true" : "false"} onValueChange={(v) => setOptions([{ text: "True", isCorrect: v === "true" }])}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="true">True</SelectItem><SelectItem value="false">False</SelectItem></SelectContent>
          </Select>
        </div>
      )}

      {(questionType === "mcq_single" || questionType === "mcq_multiple") && (
        <div className="space-y-2">
          <Label>Options</Label>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <Checkbox
                checked={o.isCorrect}
                onCheckedChange={(checked) => {
                  setOptions((prev) => prev.map((opt, idx) => {
                    if (idx !== i) return questionType === "mcq_single" ? { ...opt, isCorrect: false } : opt;
                    return { ...opt, isCorrect: !!checked };
                  }));
                }}
              />
              <Input value={o.text} onChange={(e) => setOptions((prev) => prev.map((opt, idx) => idx === i ? { ...opt, text: e.target.value } : opt))} placeholder={`Option ${i + 1}`} />
              {options.length > 2 && (
                <Button type="button" variant="ghost" size="icon" onClick={() => setOptions((prev) => prev.filter((_, idx) => idx !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <Button type="button" variant="outline" size="sm" onClick={() => setOptions((prev) => [...prev, { text: "", isCorrect: false }])}>
              <Plus className="h-4 w-4" /> Add option
            </Button>
          )}
        </div>
      )}

      <Button onClick={submit} disabled={isPending || !prompt.trim()}>{isPending ? "Adding…" : "Add question"}</Button>
    </div>
  );
}
