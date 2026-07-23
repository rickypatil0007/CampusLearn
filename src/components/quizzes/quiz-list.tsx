import Link from "next/link";
import { ListChecks, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate } from "@/lib/utils";

export async function QuizList({ subjectId }: { subjectId?: string }) {
  const user = await requireUser();
  const supabase = await createClient();
  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);

  let query = supabase
    .from("quizzes")
    .select("id, title, status, due_at, time_limit_minutes, max_attempts, subjects:subject_id(name, code)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (!isStaff) query = query.eq("status", "published");
  if (subjectId) query = query.eq("subject_id", subjectId);

  const { data: quizzes } = await query;

  if (!quizzes || quizzes.length === 0) {
    return <EmptyState icon={ListChecks} title="No quizzes yet" description={isStaff ? "Create a quiz to get started." : "Published quizzes will appear here."} />;
  }

  return (
    <div className="space-y-3">
      {quizzes.map((q) => (
        <Link key={q.id} href={isStaff ? `/faculty/quizzes/${q.id}` : `/quizzes/${q.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="font-medium text-foreground">{q.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  {!subjectId && <span>{(q.subjects as unknown as { code: string } | null)?.code}</span>}
                  {q.time_limit_minutes && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {q.time_limit_minutes} min</span>}
                  {q.due_at && <span>Due {formatDate(q.due_at)}</span>}
                  <span>{q.max_attempts} attempt(s) allowed</span>
                </div>
              </div>
              <Badge variant={q.status === "published" ? "success" : q.status === "draft" ? "muted" : "outline"}>{q.status}</Badge>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
