"use client";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { assignFacultyTeachingAction, revokeFacultyTeachingAction } from "../_actions";

interface Subject {
  id: string; name: string; code: string; department_id: string; semester_id: string;
  departments: { name: string } | null;
  semesters: { id: string; name: string; programme_id: string; academic_year_id: string; year_of_study_id: string | null } | null;
}
interface DivisionOpt { id: string; name: string; semester_id: string }
interface Assignment {
  id: string; subject_id: string; division_id: string; is_active: boolean; assigned_at: string;
  subjects: { name: string; code: string } | null;
  divisions: { name: string } | null;
}

export function TeachingAssignmentsManager({ facultyId, subjects, divisions, assignments }: {
  facultyId: string; subjects: Subject[]; divisions: DivisionOpt[]; assignments: Assignment[];
}) {
  const [subjectId, setSubjectId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const availableDivisions = useMemo(
    () => (selectedSubject ? divisions.filter((d) => d.semester_id === selectedSubject.semester_id) : []),
    [divisions, selectedSubject]
  );

  const activeAssignments = assignments.filter((a) => a.is_active);

  function handleAssign() {
    if (!selectedSubject || !divisionId || !selectedSubject.semesters) return;
    startTransition(async () => {
      const result = await assignFacultyTeachingAction({
        facultyId,
        subjectId: selectedSubject.id,
        departmentId: selectedSubject.department_id,
        programmeId: selectedSubject.semesters!.programme_id,
        academicYearId: selectedSubject.semesters!.academic_year_id,
        yearOfStudyId: selectedSubject.semesters!.year_of_study_id ?? "",
        semesterId: selectedSubject.semester_id,
        divisionId,
      });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Teaching assignment added.");
      setDivisionId("");
    });
  }

  function handleRevoke(assignmentId: string) {
    startTransition(async () => {
      const result = await revokeFacultyTeachingAction(assignmentId, facultyId);
      if (!result.ok) { toast.error(result.error); return; }
      toast.success("Assignment revoked.");
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setDivisionId(""); }}>
            <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
            <SelectContent>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.code} — {s.name} ({s.departments?.name}, {s.semesters?.name})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Select value={divisionId} onValueChange={setDivisionId} disabled={!subjectId}>
          <SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger>
          <SelectContent>{availableDivisions.map((d) => <SelectItem key={d.id} value={d.id}>Division {d.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <Button size="sm" onClick={handleAssign} disabled={!subjectId || !divisionId || isPending}>Add assignment</Button>

      {activeAssignments.length > 0 ? (
        <Table>
          <TableHeader><TableRow><TableHead>Subject</TableHead><TableHead>Division</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {activeAssignments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="text-foreground">{a.subjects?.code} — {a.subjects?.name}</TableCell>
                <TableCell className="text-muted-foreground">Division {a.divisions?.name}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" variant="ghost" onClick={() => handleRevoke(a.id)} disabled={isPending}>Revoke</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No active teaching assignments.</p>
      )}
      {assignments.some((a) => !a.is_active) && (
        <div className="pt-2">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">History</p>
          <div className="space-y-1">
            {assignments.filter((a) => !a.is_active).map((a) => (
              <p key={a.id} className="text-xs text-muted-foreground">
                <Badge variant="outline" className="mr-2">Revoked</Badge>
                {a.subjects?.code} — Division {a.divisions?.name}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
