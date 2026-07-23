import { requireUserOrRedirect } from "@/lib/auth/session";
import { SubjectTabs } from "@/components/layout/subject-tabs";
import { DiscussionList } from "@/components/discussions/discussion-list";

export default async function SubjectDiscussionPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <SubjectTabs subjectId={subjectId} />
      <DiscussionList subjectId={subjectId} />
    </div>
  );
}
