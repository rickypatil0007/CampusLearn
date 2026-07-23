import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewQuizForm } from "./new-quiz-form";

export const metadata: Metadata = { title: "New Quiz" };

export default async function NewQuizPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: subjects } = await supabase.from("subject_faculty").select("subjects(id, name, code)").eq("faculty_id", user.id);
  const subjectOptions = (subjects ?? []).map((s) => (s as unknown as { subjects: { id: string; name: string; code: string } }).subjects).filter(Boolean);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">New Quiz</h1>
        <p className="text-sm text-muted-foreground">Created as a draft — add questions, then publish when ready.</p>
      </div>
      <Card>
        <CardHeader><CardTitle>Quiz details</CardTitle></CardHeader>
        <CardContent><NewQuizForm subjects={subjectOptions} /></CardContent>
      </Card>
    </div>
  );
}
