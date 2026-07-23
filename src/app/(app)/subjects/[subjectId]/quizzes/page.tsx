import { requireUserOrRedirect } from "@/lib/auth/session";
import { SubjectTabs } from "@/components/layout/subject-tabs";
import { QuizList } from "@/components/quizzes/quiz-list";

export default async function SubjectQuizzesPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <SubjectTabs subjectId={subjectId} />
      <QuizList subjectId={subjectId} />
    </div>
  );
}
