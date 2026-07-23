import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";
import { BarChart3 } from "lucide-react";

export const metadata: Metadata = { title: "Analytics" };

export default async function AnalyticsPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: results } = await supabase
    .from("quiz_results")
    .select("accuracy, marks_obtained, total_marks, weak_topic_ids, strong_topic_ids, quiz_attempts!inner(student_id, quiz_id, submitted_at)")
    .eq("quiz_attempts.student_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const weakTopicIds = Array.from(new Set((results ?? []).flatMap((r) => r.weak_topic_ids ?? [])));
  const strongTopicIds = Array.from(new Set((results ?? []).flatMap((r) => r.strong_topic_ids ?? [])));

  const { data: weakTopics } = weakTopicIds.length ? await supabase.from("topics").select("id, title").in("id", weakTopicIds) : { data: [] };
  const { data: strongTopics } = strongTopicIds.length ? await supabase.from("topics").select("id, title").in("id", strongTopicIds) : { data: [] };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Your Analytics</h1>
        <p className="text-sm text-muted-foreground">Performance insights based on your quiz attempts. Not a diagnosis of ability — a guide for what to review next.</p>
      </div>

      {results && results.length > 0 ? (
        <>
          <Card>
            <CardHeader><CardTitle>Recent quiz performance</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">Attempt {i + 1}</span>
                  <span className="text-muted-foreground">{r.marks_obtained}/{r.total_marks} ({r.accuracy?.toFixed(0)}%)</span>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Topics to review</CardTitle></CardHeader>
              <CardContent>
                {weakTopics && weakTopics.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">{weakTopics.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
                ) : <p className="text-sm text-muted-foreground">No specific weak topics identified yet.</p>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Strong topics</CardTitle></CardHeader>
              <CardContent>
                {strongTopics && strongTopics.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">{strongTopics.map((t) => <li key={t.id}>{t.title}</li>)}</ul>
                ) : <p className="text-sm text-muted-foreground">Attempt more quizzes to surface your strengths.</p>}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <EmptyState icon={BarChart3} title="No quiz data yet" description="Attempt a published quiz to see your personalized analytics here." />
      )}
    </div>
  );
}
