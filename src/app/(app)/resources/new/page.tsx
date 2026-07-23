import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadResourceForm } from "../../faculty/resources/new/upload-form";

export const metadata: Metadata = { title: "Upload Resource" };

export default async function UploadResourcePage() {
  const user = await requirePermission("resource.upload");
  const supabase = await createClient();

  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  const query = isStaff
    ? supabase.from("subject_faculty").select("subjects(id, name, code, units(id, title))").eq("faculty_id", user.id)
    : supabase.from("subject_enrollments").select("subjects(id, name, code, units(id, title))").eq("student_id", user.id);
  const { data } = await query;
  const subjects = (data ?? []).map((row) => (row as unknown as { subjects: { id: string; name: string; code: string; units: { id: string; title: string }[] } }).subjects).filter(Boolean);

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Upload Resource</h1>
        <p className="text-sm text-muted-foreground">Your submission will be marked pending review until a Faculty member approves it.</p>
      </div>
      <Card><CardHeader><CardTitle>Resource details</CardTitle></CardHeader><CardContent><UploadResourceForm subjects={subjects} /></CardContent></Card>
    </div>
  );
}
