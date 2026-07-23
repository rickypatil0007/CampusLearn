import { requireUserOrRedirect } from "@/lib/auth/session";
import { SubjectTabs } from "@/components/layout/subject-tabs";
import { AssignmentList } from "@/components/assignments/assignment-list";

export default async function SubjectAssignmentsPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <SubjectTabs subjectId={subjectId} />
      <AssignmentList subjectId={subjectId} />
    </div>
  );
}
