"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { publishQuizAction } from "../../../quizzes/_actions";

export function PublishButton({ quizId, hasQuestions }: { quizId: string; hasQuestions: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      disabled={isPending || !hasQuestions}
      title={!hasQuestions ? "Add at least one question first" : undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await publishQuizAction(quizId);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Quiz published.");
          router.refresh();
        })
      }
    >
      {isPending ? "Publishing…" : "Publish quiz"}
    </Button>
  );
}
