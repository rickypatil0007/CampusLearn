import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { QuizList } from "@/components/quizzes/quiz-list";

export const metadata: Metadata = { title: "My Quizzes" };

export default function FacultyQuizzesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Quizzes</h1>
          <p className="text-sm text-muted-foreground">Create and manage quizzes for your subjects.</p>
        </div>
        <Link href="/faculty/quizzes/new"><Button size="sm"><Plus className="h-4 w-4" /> New quiz</Button></Link>
      </div>
      <QuizList />
    </div>
  );
}
