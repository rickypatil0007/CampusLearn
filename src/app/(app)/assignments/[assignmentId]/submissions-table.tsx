"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { gradeSubmissionAction, getSubmissionFileUrlAction } from "../_actions";
import { formatDateTime } from "@/lib/utils";

interface Submission {
  id: string; status: string; submitted_at: string | null; marks_obtained: number | null;
  profiles: { full_name: string } | null;
  assignment_submission_files: { id: string; file_path: string; original_filename: string }[];
}

export function SubmissionsTable({ submissions, maxMarks }: { submissions: Submission[]; maxMarks: number }) {
  if (submissions.length === 0) return <p className="text-sm text-muted-foreground">No submissions yet.</p>;
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Student</TableHead><TableHead>Submitted</TableHead><TableHead>Files</TableHead><TableHead>Status</TableHead><TableHead>Marks</TableHead><TableHead className="text-right">Grade</TableHead></TableRow></TableHeader>
      <TableBody>
        {submissions.map((s) => (
          <SubmissionRow key={s.id} submission={s} maxMarks={maxMarks} />
        ))}
      </TableBody>
    </Table>
  );
}

function SubmissionRow({ submission, maxMarks }: { submission: Submission; maxMarks: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [marks, setMarks] = useState(submission.marks_obtained ?? 0);
  const [comment, setComment] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <TableRow>
      <TableCell className="text-foreground">{submission.profiles?.full_name}</TableCell>
      <TableCell className="text-muted-foreground">{submission.submitted_at ? formatDateTime(submission.submitted_at) : "—"}</TableCell>
      <TableCell>
        {submission.assignment_submission_files.map((f) => (
          <button
            key={f.id}
            className="block text-left text-xs text-primary hover:underline"
            onClick={async () => {
              const result = await getSubmissionFileUrlAction(f.file_path);
              if (result.ok) window.open(result.data.url, "_blank", "noopener,noreferrer");
            }}
          >
            {f.original_filename}
          </button>
        ))}
      </TableCell>
      <TableCell><Badge variant={submission.status === "graded" ? "success" : "outline"}>{submission.status.replace("_", " ")}</Badge></TableCell>
      <TableCell className="text-muted-foreground">{submission.marks_obtained ?? "—"}</TableCell>
      <TableCell className="text-right">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button variant="outline" size="sm">Grade</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Grade submission</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input type="number" min={0} max={maxMarks} value={marks} onChange={(e) => setMarks(Number(e.target.value))} />
              <Textarea placeholder="Feedback (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  const result = await gradeSubmissionAction({ submissionId: submission.id, marksObtained: 0, comment, requestResubmission: true });
                  if (!result.ok) { toast.error(result.error); return; }
                  toast.success("Resubmission requested.");
                  setOpen(false); router.refresh();
                })}
              >
                Request resubmission
              </Button>
              <Button
                disabled={isPending}
                onClick={() => startTransition(async () => {
                  const result = await gradeSubmissionAction({ submissionId: submission.id, marksObtained: marks, comment });
                  if (!result.ok) { toast.error(result.error); return; }
                  toast.success("Graded.");
                  setOpen(false); router.refresh();
                })}
              >
                Save grade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </TableCell>
    </TableRow>
  );
}
