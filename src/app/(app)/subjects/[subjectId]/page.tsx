import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { SubjectTabs } from "@/components/layout/subject-tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricCard } from "@/components/dashboard/metric-card";
import { FileText, ListChecks, ClipboardList, Users } from "lucide-react";

export const metadata: Metadata = { title: "Subject" };

export default async function SubjectOverviewPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, code, description, credits, departments:department_id(name), semesters:semester_id(name)")
    .eq("id", subjectId)
    .maybeSingle();
  if (!subject) notFound();

  const [{ count: resourceCount }, { count: quizCount }, { count: assignmentCount }, { count: studentCount }, { data: units }] = await Promise.all([
    supabase.from("resources").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).eq("approval_status", "approved"),
    supabase.from("quizzes").select("id", { count: "exact", head: true }).eq("subject_id", subjectId).eq("status", "published"),
    supabase.from("assignments").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    supabase.from("subject_enrollments").select("id", { count: "exact", head: true }).eq("subject_id", subjectId),
    supabase.from("units").select("id, title, sequence, topics(id, title, sequence)").eq("subject_id", subjectId).order("sequence"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <span className="font-mono-label text-primary">{subject.code}</span>
        <h1 className="text-xl font-semibold text-foreground">{subject.name}</h1>
        <p className="text-sm text-muted-foreground">
          {(subject.departments as unknown as { name: string } | null)?.name} · {(subject.semesters as unknown as { name: string } | null)?.name} · {subject.credits} credits
        </p>
      </div>

      <SubjectTabs subjectId={subjectId} />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Resources" value={resourceCount ?? 0} icon={FileText} />
        <MetricCard label="Quizzes" value={quizCount ?? 0} icon={ListChecks} />
        <MetricCard label="Assignments" value={assignmentCount ?? 0} icon={ClipboardList} />
        <MetricCard label="Students" value={studentCount ?? 0} icon={Users} />
      </div>

      <Card>
        <CardHeader><CardTitle>About</CardTitle></CardHeader>
        <CardContent className="text-sm text-foreground">{subject.description || "No description provided."}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Units &amp; Topics</CardTitle></CardHeader>
        <CardContent>
          {units && units.length > 0 ? (
            <div className="space-y-4">
              {units.map((u) => (
                <div key={u.id}>
                  <p className="font-medium text-foreground">Unit {u.sequence}: {u.title}</p>
                  <ul className="ml-4 mt-1 list-disc text-sm text-muted-foreground">
                    {(u.topics as unknown as { id: string; title: string }[])?.map((t) => <li key={t.id}>{t.title}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No units defined yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
