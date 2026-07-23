import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AssignmentsManager, type Teacher, type Cr } from "./assignments-manager";

export default async function ClassAssignmentsPage() {
  await requirePermission("class.assign_cr");
  const supabase = await createClient();

  const { data } = await supabase.rpc("get_registration_academic_data");
  if (!data) return <div>Failed to load academic data.</div>;

  const typedData = data as {
    departments: { id: string; name: string }[];
    programmes: { id: string; name: string; department_id: string }[];
    academic_years: { id: string; label: string; is_current: boolean }[];
    years_of_study: { id: string; name: string }[];
    semesters: { id: string; name: string; programme_id: string; academic_year_id: string; year_of_study_id: string }[];
    divisions: { id: string; name: string; semester_id: string }[];
  };

  // We also need the current assignments to show in the manager.
  // Let's fetch active class teachers and CRs.
  const [{ data: teachers }, { data: crs }] = await Promise.all([
    supabase
      .from("class_teacher_assignments")
      .select("id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, faculty:faculty_id(id, full_name, email)")
      .eq("is_active", true),
    supabase
      .from("class_representative_assignments")
      .select("id, department_id, programme_id, academic_year_id, year_of_study_id, semester_id, division_id, slot_number, student:student_id(id, full_name, email, student_id)")
      .eq("is_active", true)
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Class Assignments</h1>
        <p className="text-sm text-muted-foreground">Assign Class Teachers and Class Representatives to divisions.</p>
      </div>

      <AssignmentsManager 
        academicData={typedData} 
        activeTeachers={(teachers ?? []) as unknown as Teacher[]} 
        activeCrs={(crs ?? []) as unknown as Cr[]} 
      />
    </div>
  );
}
