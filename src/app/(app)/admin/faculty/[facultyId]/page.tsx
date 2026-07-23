import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TeachingAssignmentsManager } from "./teaching-assignments-manager";
import { FacultyStatusButton } from "./faculty-status-button";

export const metadata: Metadata = { title: "Faculty Profile" };

export default async function FacultyDetailPage({ params }: { params: Promise<{ facultyId: string }> }) {
  await requirePermission("faculty.manage");
  const { facultyId } = await params;
  const supabase = await createClient();

  const { data: faculty } = await supabase
    .from("profiles")
    .select("id, full_name, email, is_suspended, suspended_reason, department_id, departments:department_id(name)")
    .eq("id", facultyId)
    .eq("role", "faculty")
    .maybeSingle();
  if (!faculty) notFound();

  const [{ data: subjects }, { data: assignments }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, department_id, semester_id, departments:department_id(name), semesters:semester_id(id, name, programme_id, academic_year_id, year_of_study_id)")
      .is("deleted_at", null)
      .order("code"),
    supabase
      .from("faculty_teaching_assignments")
      .select("id, subject_id, division_id, is_active, assigned_at, subjects:subject_id(name, code), divisions:division_id(name)")
      .eq("faculty_id", facultyId)
      .order("assigned_at", { ascending: false }),
  ]);

  const { data: divisions } = await supabase.from("divisions").select("id, name, semester_id");

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{faculty.full_name}</h1>
          <p className="text-sm text-muted-foreground">{faculty.email} · {(faculty.departments as unknown as { name: string } | null)?.name ?? "No department"}</p>
        </div>
        <div className="flex items-center gap-2">
          {faculty.is_suspended ? <Badge variant="destructive">Deactivated</Badge> : <Badge variant="outline">Active</Badge>}
          <FacultyStatusButton facultyId={faculty.id} isSuspended={faculty.is_suspended} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Teaching assignments</CardTitle>
          <CardDescription>Subjects and classes this Faculty member may access. Filters everywhere in their account (uploads, quizzes, dashboards) to exactly these.</CardDescription>
        </CardHeader>
        <CardContent>
          <TeachingAssignmentsManager
            facultyId={faculty.id}
            subjects={(subjects ?? []) as never}
            divisions={divisions ?? []}
            assignments={(assignments ?? []) as never}
          />
        </CardContent>
      </Card>
    </div>
  );
}
