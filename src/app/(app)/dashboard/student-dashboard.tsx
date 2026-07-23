import Link from "next/link";
import { TrendingUp, ListChecks, ClipboardList, Flame, FileCheck, CalendarClock, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard, EmptyState } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate, daysAgoIso } from "@/lib/utils";

export async function StudentDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [
    { count: enrolledSubjects }, { data: results }, { data: pendingAssignments },
    { data: upcomingQuizzes }, { data: latestResources }, { data: announcements },
    { data: bookmarks }, { data: recentActivity },
  ] = await Promise.all([
    supabase.from("subject_enrollments").select("id", { count: "exact", head: true }).eq("student_id", userId),
    supabase.from("quiz_results").select("accuracy, marks_obtained, total_marks, weak_topic_ids, quiz_attempts!inner(student_id, submitted_at)").eq("quiz_attempts.student_id", userId).order("created_at", { ascending: false }).limit(10),
    supabase.from("assignment_submissions").select("id, assignments(title, due_at)").eq("student_id", userId).eq("status", "not_started").limit(5),
    supabase.from("quizzes").select("id, title, due_at").eq("status", "published").gte("due_at", new Date().toISOString()).order("due_at").limit(5),
    supabase.from("resources").select("id, title, created_at, subjects:subject_id(code)").eq("approval_status", "approved").order("created_at", { ascending: false }).limit(5),
    supabase.from("announcements").select("id, title, priority, publish_at").eq("approval_status", "approved").order("publish_at", { ascending: false }).limit(4),
    supabase.from("resource_bookmarks").select("id, resources(id, title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("resource_views").select("created_at").eq("user_id", userId).gte("created_at", daysAgoIso(14)),
  ]);

  const quizAverage = results && results.length > 0 ? Math.round(results.reduce((sum, r) => sum + (r.accuracy ?? 0), 0) / results.length) : null;
  const activeDays = new Set((recentActivity ?? []).map((a) => new Date(a.created_at).toDateString()));
  const studyStreak = activeDays.size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Your Dashboard</h1>
        <p className="text-sm text-muted-foreground">A snapshot of your learning progress across CampusLearn.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <MetricCard label="Enrolled Subjects" value={enrolledSubjects ?? 0} icon={TrendingUp} accent />
        <MetricCard label="Quiz Average" value={quizAverage !== null ? `${quizAverage}%` : "—"} icon={ListChecks} />
        <MetricCard label="Pending Assignments" value={pendingAssignments?.length ?? 0} icon={ClipboardList} />
        <MetricCard label="Study Streak (14d)" value={`${studyStreak} days`} icon={Flame} />
        <MetricCard label="Resources Bookmarked" value={bookmarks?.length ?? 0} icon={FileCheck} />
        <MetricCard label="Upcoming Quizzes" value={upcomingQuizzes?.length ?? 0} icon={CalendarClock} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Upcoming Deadlines</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {upcomingQuizzes && upcomingQuizzes.length > 0 ? upcomingQuizzes.map((q) => (
              <div key={q.id} className="flex items-center justify-between text-sm">
                <Link href={`/quizzes/${q.id}`} className="text-foreground hover:underline">{q.title}</Link>
                <span className="text-xs text-muted-foreground">{q.due_at ? formatDate(q.due_at) : "—"}</span>
              </div>
            )) : <EmptyState title="No upcoming quizzes" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Latest Notes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {latestResources && latestResources.length > 0 ? latestResources.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <Link href={`/resources/${r.id}`} className="truncate text-foreground hover:underline">{r.title}</Link>
                <Badge variant="muted">{(r.subjects as unknown as { code: string } | null)?.code}</Badge>
              </div>
            )) : <EmptyState title="No resources yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {announcements && announcements.length > 0 ? announcements.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{a.title}</span>
                <Badge variant={a.priority === "urgent" ? "destructive" : a.priority === "important" ? "warning" : "outline"}>{a.priority}</Badge>
              </div>
            )) : <EmptyState title="No announcements yet" />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Study Recommendation</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results && results.length > 0
                ? "Based on your recent quiz attempts, review the weak topics identified in your Analytics page, then generate a focused practice set with the AI Assistant."
                : "Attempt a quiz to unlock personalized study recommendations."}
            </p>
            <Link href="/ai/study-planner"><Button size="sm" variant="outline">Generate a study plan</Button></Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
