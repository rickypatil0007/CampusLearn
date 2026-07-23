"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { saveAnswerAction, submitAttemptAction } from "../../_actions";

interface Question {
  id: string; type: string; prompt: string; marks: number; options: { id: string; text: string }[];
}
interface ExistingAnswer { questionId: string; selectedOptionIds: string[]; freeText: string }

export function QuizAttemptForm({
  quizId, quizTitle, attemptId, timeLimitMinutes, questions, existingAnswers,
}: {
  quizId: string; quizTitle: string; attemptId: string; timeLimitMinutes: number | null;
  questions: Question[]; existingAnswers: ExistingAnswer[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, { optionIds: string[]; text: string }>>(() => {
    const map: Record<string, { optionIds: string[]; text: string }> = {};
    for (const a of existingAnswers) map[a.questionId] = { optionIds: a.selectedOptionIds, text: a.freeText };
    return map;
  });
  const [secondsLeft, setSecondsLeft] = useState(timeLimitMinutes ? timeLimitMinutes * 60 : null);
  const submittedRef = useRef(false);

  function setAnswer(questionId: string, optionIds: string[], text = "") {
    setAnswers((prev) => ({ ...prev, [questionId]: { optionIds, text } }));
    startTransition(async () => {
      await saveAnswerAction({ attemptId, questionId, selectedOptionIds: optionIds, freeTextAnswer: text });
    });
  }

  function handleFinalSubmit(auto = false) {
    if (submittedRef.current) return;
    submittedRef.current = true;
    startTransition(async () => {
      const result = await submitAttemptAction(attemptId);
      if (!result.ok) { toast.error(result.error); submittedRef.current = false; return; }
      toast.success(auto ? "Time expired — quiz submitted." : "Quiz submitted.");
      router.push(`/quizzes/${quizId}/results?attempt=${attemptId}`);
    });
  }

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      handleFinalSubmit(true);
      return;
    }
    const timer = setInterval(() => setSecondsLeft((s) => (s !== null ? s - 1 : s)), 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  const minutes = secondsLeft !== null ? Math.floor(secondsLeft / 60) : null;
  const seconds = secondsLeft !== null ? secondsLeft % 60 : null;

  return (
    <div className="max-w-2xl space-y-6 pb-24">
      <div className="sticky top-0 z-10 -mx-4 flex items-center justify-between border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <h1 className="text-lg font-semibold text-foreground">{quizTitle}</h1>
        {secondsLeft !== null && (
          <div className="flex items-center gap-2 font-mono text-sm text-primary">
            <Clock className="h-4 w-4" /> {minutes}:{String(seconds).padStart(2, "0")}
          </div>
        )}
      </div>

      {questions.map((q, idx) => (
        <Card key={q.id}>
          <CardHeader>
            <CardTitle className="text-foreground normal-case text-sm">Q{idx + 1}. {q.prompt} <span className="text-muted-foreground">({q.marks} marks)</span></CardTitle>
          </CardHeader>
          <CardContent>
            {q.type === "mcq_single" || q.type === "true_false" ? (
              <RadioGroup value={answers[q.id]?.optionIds[0] ?? ""} onValueChange={(value) => setAnswer(q.id, [value])}>
                {q.options.map((o) => (
                  <div key={o.id} className="flex items-center gap-2">
                    <RadioGroupItem value={o.id} id={o.id} />
                    <Label htmlFor={o.id} className="cursor-pointer font-normal">{o.text}</Label>
                  </div>
                ))}
              </RadioGroup>
            ) : q.type === "mcq_multiple" ? (
              <div className="space-y-2">
                {q.options.map((o) => {
                  const checked = answers[q.id]?.optionIds.includes(o.id) ?? false;
                  return (
                    <div key={o.id} className="flex items-center gap-2">
                      <Checkbox
                        id={o.id}
                        checked={checked}
                        onCheckedChange={(v) => {
                          const current = answers[q.id]?.optionIds ?? [];
                          const next = v ? [...current, o.id] : current.filter((id) => id !== o.id);
                          setAnswer(q.id, next);
                        }}
                      />
                      <Label htmlFor={o.id} className="cursor-pointer font-normal">{o.text}</Label>
                    </div>
                  );
                })}
              </div>
            ) : (
              <Textarea value={answers[q.id]?.text ?? ""} onChange={(e) => setAnswer(q.id, [], e.target.value)} placeholder="Type your answer…" />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-background p-4 lg:pl-64">
        <div className="mx-auto flex max-w-2xl justify-end">
          <Button onClick={() => setConfirmOpen(true)} disabled={isPending}>Submit quiz</Button>
        </div>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit quiz?</DialogTitle>
            <DialogDescription>You won&apos;t be able to change your answers after submitting.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Keep reviewing</Button>
            <Button disabled={isPending} onClick={() => { setConfirmOpen(false); handleFinalSubmit(false); }}>
              {isPending ? "Submitting…" : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
