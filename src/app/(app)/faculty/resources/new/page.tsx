import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MultiUploadForm, type ClassOption, type SubjectOption } from "./multi-upload-form";

export const metadata: Metadata = { title: "Upload Resources" };

export default async function NewResourcePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const isFaculty = user.role === "faculty" || user.role === "dept_admin" || user.role === "super_admin";
  const isCr = user.role === "class_rep";

  const subjectQuery = isFaculty
    ? supabase.from("subject_faculty").select("subjects(id, name, code, units(id, title))").eq("faculty_id", user.id)
    : supabase.from("subject_enrollments").select("subjects(id, name, code, units(id, title))").eq("student_id", user.id);
  const { data: subjectRows } = await subjectQuery;
  const subjects: SubjectOption[] = (subjectRows ?? [])
    .map((row) => (row as unknown as { subjects: SubjectOption | null }).subjects)
    .filter((s): s is SubjectOption => !!s);

  // Build the class options each subject may be uploaded to.
  const classesBySubject: Record<string, ClassOption[]> = {};

  if (isFaculty) {
    const { data: assignments } = await supabase
      .from("faculty_teaching_assignments")
      .select("subject_id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, departments:department_id(name), divisions:division_id(name), semesters:semester_id(name)")
      .eq("faculty_id", user.id)
      .eq("is_active", true);
    for (const a of assignments ?? []) {
      const dept = (a.departments as unknown as { name: string } | null)?.name ?? "";
      const div = (a.divisions as unknown as { name: string } | null)?.name ?? "";
      const sem = (a.semesters as unknown as { name: string } | null)?.name ?? "";
      const option: ClassOption = {
        key: `${a.department_id}|${a.programme_id}|${a.academic_year_id}|${a.semester_id}|${a.division_id}`,
        label: `${dept} · ${sem} · Div ${div}`,
        department_id: a.department_id, programme_id: a.programme_id, academic_year_id: a.academic_year_id,
        year_of_study_id: a.year_of_study_id, semester_id: a.semester_id, division_id: a.division_id,
      };
      (classesBySubject[a.subject_id] ??= []).push(option);
    }
  } else if (isCr) {
    const { data: assignment } = await supabase
      .from("class_representative_assignments")
      .select("department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, departments:department_id(name), divisions:division_id(name), semesters:semester_id(name)")
      .eq("student_id", user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (assignment) {
      const dept = (assignment.departments as unknown as { name: string } | null)?.name ?? "";
      const div = (assignment.divisions as unknown as { name: string } | null)?.name ?? "";
      const sem = (assignment.semesters as unknown as { name: string } | null)?.name ?? "";
      const option: ClassOption = {
        key: `${assignment.department_id}|${assignment.programme_id}|${assignment.academic_year_id}|${assignment.semester_id}|${assignment.division_id}`,
        label: `${dept} · ${sem} · Div ${div} (your class)`,
        department_id: assignment.department_id, programme_id: assignment.programme_id, academic_year_id: assignment.academic_year_id,
        year_of_study_id: assignment.year_of_study_id, semester_id: assignment.semester_id, division_id: assignment.division_id,
      };
      for (const s of subjects) classesBySubject[s.id] = [option];
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Upload Resources</h1>
        <p className="text-sm text-muted-foreground">
          {isFaculty
            ? "Select one or more assigned classes. Faculty uploads are published immediately and marked Verified."
            : isCr
              ? "Uploads are published immediately to your assigned class."
              : "Class Representative uploads require Faculty review before appearing to students."}
        </p>
      </div>
      <Card>
        <CardHeader><CardTitle>Resource details</CardTitle></CardHeader>
        <CardContent>
          <MultiUploadForm subjects={subjects} classesBySubject={classesBySubject} />
        </CardContent>
      </Card>
    </div>
  );
}
