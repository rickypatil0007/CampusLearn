import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AssignmentList } from "@/components/assignments/assignment-list";

export const metadata: Metadata = { title: "My Assignments" };

export default function FacultyAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Assignments</h1>
          <p className="text-sm text-muted-foreground">Create assignments and review submissions.</p>
        </div>
        <Link href="/faculty/assignments/new"><Button size="sm"><Plus className="h-4 w-4" /> New assignment</Button></Link>
      </div>
      <AssignmentList />
    </div>
  );
}
