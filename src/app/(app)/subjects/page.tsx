import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Subjects" };

export default async function SubjectsPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);

  const query = isStaff
    ? supabase.from("subject_faculty").select("subjects(id, name, code, credits, description, semesters:semester_id(name))").eq("faculty_id", user.id)
    : supabase.from("subject_enrollments").select("subjects(id, name, code, credits, description, semesters:semester_id(name))").eq("student_id", user.id);

  const { data } = await query;
  const subjects = (data ?? []).map((row) => (row as unknown as { subjects: { id: string; name: string; code: string; credits: number; description: string | null; semesters: { name: string } | null } }).subjects).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Subjects</h1>
        <p className="text-sm text-muted-foreground">{isStaff ? "Subjects you teach." : "Subjects you're enrolled in."}</p>
      </div>

      {subjects.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subjects.map((s) => (
            <Link key={s.id} href={`/subjects/${s.id}`}>
              <Card className="h-full transition-colors hover:border-primary/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <span className="font-mono-label text-primary">{s.code}</span>
                    <Badge variant="outline">{s.semesters?.name ?? "—"}</Badge>
                  </div>
                  <CardTitle className="text-foreground normal-case text-base">{s.name}</CardTitle>
                  <CardDescription className="line-clamp-2">{s.description || "No description yet."}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{s.credits} credits</CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={BookOpen} title="No subjects yet" description={isStaff ? "An administrator hasn't assigned you to any subjects yet." : "You're not enrolled in any subjects yet. Contact your administrator."} />
      )}
    </div>
  );
}
