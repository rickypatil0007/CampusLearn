import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { QuizList } from "@/components/quizzes/quiz-list";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage() {
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Quizzes</h1>
        <p className="text-sm text-muted-foreground">Published quizzes across your enrolled subjects.</p>
      </div>
      <QuizList />
    </div>
  );
}
