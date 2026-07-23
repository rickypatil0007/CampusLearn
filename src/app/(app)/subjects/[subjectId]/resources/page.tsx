import { requireUserOrRedirect } from "@/lib/auth/session";
import { SubjectTabs } from "@/components/layout/subject-tabs";
import { ResourceList } from "@/components/resources/resource-list";

export default async function SubjectResourcesPage({ params }: { params: Promise<{ subjectId: string }> }) {
  const { subjectId } = await params;
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <SubjectTabs subjectId={subjectId} />
      <ResourceList subjectId={subjectId} />
    </div>
  );
}
