import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { SubmitAssignmentForm } from "./submit-form";
import { SubmissionsTable } from "./submissions-table";

export default async function AssignmentDetailPage({ params }: { params: Promise<{ assignmentId: string }> }) {
  const { assignmentId } = await params;
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, instructions, due_at, max_marks, allow_multiple_files, allow_resubmission, late_submission_allowed, subjects:subject_id(name)")
    .eq("id", assignmentId)
    .maybeSingle();
  if (!assignment) notFound();

  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);

  if (isStaff) {
    const { data: submissions } = await supabase
      .from("assignment_submissions")
      .select("id, status, submitted_at, marks_obtained, profiles:student_id(full_name), assignment_submission_files(id, file_path, original_filename)")
      .eq("assignment_id", assignmentId)
      .order("submitted_at", { ascending: false });

    return (
      <div className="max-w-3xl space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">{assignment.title}</h1>
          <p className="text-sm text-muted-foreground">{(assignment.subjects as unknown as { name: string } | null)?.name} · Due {formatDateTime(assignment.due_at)} · {assignment.max_marks} marks</p>
        </div>
        <Card><CardHeader><CardTitle>Instructions</CardTitle></CardHeader><CardContent className="text-sm text-foreground">{assignment.instructions}</CardContent></Card>
        <Card>
          <CardHeader><CardTitle>Submissions ({submissions?.length ?? 0})</CardTitle></CardHeader>
          <CardContent><SubmissionsTable submissions={(submissions ?? []) as never} maxMarks={assignment.max_marks} /></CardContent>
        </Card>
      </div>
    );
  }

  const { data: submission } = await supabase
    .from("assignment_submissions")
    .select("id, status, submitted_at, marks_obtained, assignment_submission_files(id, original_filename), assignment_feedback(comment, created_at)")
    .eq("assignment_id", assignmentId)
    .eq("student_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">{assignment.title}</h1>
        <p className="text-sm text-muted-foreground">{(assignment.subjects as unknown as { name: string } | null)?.name} · Due {formatDateTime(assignment.due_at)} · {assignment.max_marks} marks</p>
      </div>

      <Card><CardHeader><CardTitle>Instructions</CardTitle></CardHeader><CardContent className="text-sm text-foreground">{assignment.instructions}</CardContent></Card>

      {submission && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Your submission</CardTitle>
            <Badge variant={submission.status === "graded" ? "success" : submission.status === "resubmission_requested" ? "destructive" : "outline"}>{submission.status.replace("_", " ")}</Badge>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">Submitted {submission.submitted_at ? formatDateTime(submission.submitted_at) : "—"}</p>
            <ul className="list-disc pl-5 text-foreground">
              {(submission.assignment_submission_files as unknown as { id: string; original_filename: string }[])?.map((f) => <li key={f.id}>{f.original_filename}</li>)}
            </ul>
            {submission.marks_obtained !== null && <p className="text-foreground">Marks: <span className="text-primary font-medium">{submission.marks_obtained} / {assignment.max_marks}</span></p>}
            {(submission.assignment_feedback as unknown as { comment: string }[])?.map((f, i) => (
              <p key={i} className="rounded-md bg-muted p-2 text-muted-foreground">{f.comment}</p>
            ))}
          </CardContent>
        </Card>
      )}

      {(!submission || submission.status === "resubmission_requested" || (assignment.allow_resubmission && submission.status !== "graded")) && (
        <Card>
          <CardHeader><CardTitle>{submission ? "Resubmit" : "Submit"}</CardTitle></CardHeader>
          <CardContent><SubmitAssignmentForm assignmentId={assignmentId} allowMultipleFiles={assignment.allow_multiple_files} /></CardContent>
        </Card>
      )}
    </div>
  );
}
