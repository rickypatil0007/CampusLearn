import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { DiscussionList } from "@/components/discussions/discussion-list";
import { NewDiscussionDialog } from "./new-discussion-dialog";

export const metadata: Metadata = { title: "Discussion" };

export default async function DiscussionsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  const query = isStaff
    ? supabase.from("subject_faculty").select("subjects(id, name, code)").eq("faculty_id", user.id)
    : supabase.from("subject_enrollments").select("subjects(id, name, code)").eq("student_id", user.id);
  const { data } = await query;
  const subjects = (data ?? []).map((row) => (row as unknown as { subjects: { id: string; name: string; code: string } }).subjects).filter(Boolean);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Discussion &amp; Doubts</h1>
          <p className="text-sm text-muted-foreground">Ask questions and get Faculty-verified answers.</p>
        </div>
        <NewDiscussionDialog subjects={subjects} />
      </div>
      <DiscussionList />
    </div>
  );
}
