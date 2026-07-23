import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { AssignmentList } from "@/components/assignments/assignment-list";

export const metadata: Metadata = { title: "Assignments" };

export default async function AssignmentsPage() {
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Assignments</h1>
        <p className="text-sm text-muted-foreground">Track submissions, deadlines, and feedback.</p>
      </div>
      <AssignmentList />
    </div>
  );
}
