"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { assignClassTeacherAction, assignClassRepAction, revokeClassRepAction } from "./_actions";

type Option = { id: string; name?: string; label?: string; department_id?: string; programme_id?: string; academic_year_id?: string; year_of_study_id?: string; semester_id?: string };

export type Teacher = { id: string; department_id: string; programme_id: string; academic_year_id: string; year_of_study_id: string; semester_id: string; division_id: string; faculty: { id: string; full_name: string; email: string } };
export type Cr = { id: string; department_id: string; programme_id: string; academic_year_id: string; year_of_study_id: string; semester_id: string; division_id: string; slot_number: number; student: { id: string; full_name: string; email: string; student_id: string | null } };
type AcademicData = { departments: Option[]; programmes: Option[]; academic_years: Option[]; years_of_study: Option[]; semesters: Option[]; divisions: Option[] };

export function AssignmentsManager({ 
  academicData, activeTeachers, activeCrs 
}: { 
  academicData: AcademicData; 
  activeTeachers: Teacher[]; 
  activeCrs: Cr[]; 
}) {
  const [departmentId, setDepartmentId] = useState<string>("");
  const [programmeId, setProgrammeId] = useState<string>("");
  const [academicYearId, setAcademicYearId] = useState<string>("");
  const [yearOfStudyId, setYearOfStudyId] = useState<string>("");
  const [semesterId, setSemesterId] = useState<string>("");
  const [divisionId, setDivisionId] = useState<string>("");

  const [isPending, startTransition] = useTransition();

  const [teacherInput, setTeacherInput] = useState("");
  const [cr1Input, setCr1Input] = useState("");
  const [cr2Input, setCr2Input] = useState("");

  const filteredProgrammes = useMemo(() => academicData.programmes.filter((p: Option) => p.department_id === departmentId), [academicData.programmes, departmentId]);
  const filteredSemesters = useMemo(() => academicData.semesters.filter((s: Option) => s.programme_id === programmeId && s.academic_year_id === academicYearId && s.year_of_study_id === yearOfStudyId), [academicData.semesters, programmeId, academicYearId, yearOfStudyId]);
  const filteredDivisions = useMemo(() => academicData.divisions.filter((d: Option) => d.semester_id === semesterId), [academicData.divisions, semesterId]);

  const classScope = {
    department_id: departmentId,
    programme_id: programmeId,
    academic_year_id: academicYearId,
    year_of_study_id: yearOfStudyId,
    semester_id: semesterId,
    division_id: divisionId,
  };

  const isClassSelected = Object.values(classScope).every(Boolean);

  const currentTeacher = activeTeachers.find((t) => t.division_id === divisionId && t.semester_id === semesterId);
  const currentCrs = activeCrs.filter((c) => c.division_id === divisionId && c.semester_id === semesterId);
  const cr1 = currentCrs.find((c) => c.slot_number === 1);
  const cr2 = currentCrs.find((c) => c.slot_number === 2);

  const handleAssignTeacher = () => {
    if (!teacherInput) return;
    startTransition(async () => {
      const res = await assignClassTeacherAction({ facultyId: teacherInput, classScope });
      if (res.ok) {
        toast.success("Class Teacher assigned.");
        setTeacherInput("");
      } else toast.error(res.error);
    });
  };

  const handleAssignCr = (slot: 1 | 2, input: string) => {
    if (!input) return;
    startTransition(async () => {
      const res = await assignClassRepAction({ studentId: input, slotNumber: slot, classScope });
      if (res.ok) {
        toast.success(`CR Slot ${slot} assigned.`);
        if (slot === 1) setCr1Input(""); else setCr2Input("");
      } else toast.error(res.error);
    });
  };

  const handleRevokeCr = (assignmentId: string) => {
    startTransition(async () => {
      const res = await revokeClassRepAction({ assignmentId, reason: "Manual revoke by admin" });
      if (res.ok) toast.success("CR revoked.");
      else toast.error(res.error);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Select Class</CardTitle>
          <CardDescription>Select the exact division to manage its assignments.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={(v) => { setDepartmentId(v); setProgrammeId(""); setSemesterId(""); setDivisionId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {academicData.departments.map((d: Option) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Programme</Label>
            <Select value={programmeId} onValueChange={(v) => { setProgrammeId(v); setSemesterId(""); setDivisionId(""); }} disabled={!departmentId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredProgrammes.map((p: Option) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Academic Year</Label>
            <Select value={academicYearId} onValueChange={(v) => { setAcademicYearId(v); setSemesterId(""); setDivisionId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {academicData.academic_years.map((y: Option) => <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year of Study</Label>
            <Select value={yearOfStudyId} onValueChange={(v) => { setYearOfStudyId(v); setSemesterId(""); setDivisionId(""); }}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {academicData.years_of_study.map((y: Option) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Semester</Label>
            <Select value={semesterId} onValueChange={(v) => { setSemesterId(v); setDivisionId(""); }} disabled={!programmeId || !academicYearId || !yearOfStudyId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredSemesters.map((s: Option) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Division</Label>
            <Select value={divisionId} onValueChange={setDivisionId} disabled={!semesterId}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {filteredDivisions.map((d: Option) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isClassSelected && (
        <Card>
          <CardHeader>
            <CardTitle>2. Manage Assignments</CardTitle>
            <CardDescription>Enter the user UUID to assign.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Class Teacher */}
            <div className="space-y-4">
              <div>
                <h3 className="font-medium">Class Teacher</h3>
                {currentTeacher ? (
                  <p className="text-sm text-muted-foreground">{currentTeacher.faculty.full_name} ({currentTeacher.faculty.email})</p>
                ) : (
                  <Badge variant="secondary">None assigned</Badge>
                )}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Faculty UUID" value={teacherInput} onChange={(e) => setTeacherInput(e.target.value)} disabled={isPending} />
                <Button onClick={handleAssignTeacher} disabled={!teacherInput || isPending}>Assign</Button>
              </div>
            </div>

            {/* CR Slot 1 */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center max-w-sm">
                <div>
                  <h3 className="font-medium">Class Representative (Slot 1)</h3>
                  {cr1 ? (
                    <p className="text-sm text-muted-foreground">{cr1.student.full_name} ({cr1.student.student_id})</p>
                  ) : (
                    <Badge variant="secondary">None assigned</Badge>
                  )}
                </div>
                {cr1 && (
                  <Button variant="destructive" size="sm" onClick={() => handleRevokeCr(cr1.id)} disabled={isPending}>Revoke</Button>
                )}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Student UUID" value={cr1Input} onChange={(e) => setCr1Input(e.target.value)} disabled={isPending} />
                <Button onClick={() => handleAssignCr(1, cr1Input)} disabled={!cr1Input || isPending}>Assign</Button>
              </div>
            </div>

            {/* CR Slot 2 */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex justify-between items-center max-w-sm">
                <div>
                  <h3 className="font-medium">Class Representative (Slot 2)</h3>
                  {cr2 ? (
                    <p className="text-sm text-muted-foreground">{cr2.student.full_name} ({cr2.student.student_id})</p>
                  ) : (
                    <Badge variant="secondary">None assigned</Badge>
                  )}
                </div>
                {cr2 && (
                  <Button variant="destructive" size="sm" onClick={() => handleRevokeCr(cr2.id)} disabled={isPending}>Revoke</Button>
                )}
              </div>
              <div className="flex gap-2 max-w-sm">
                <Input placeholder="Student UUID" value={cr2Input} onChange={(e) => setCr2Input(e.target.value)} disabled={isPending} />
                <Button onClick={() => handleAssignCr(2, cr2Input)} disabled={!cr2Input || isPending}>Assign</Button>
              </div>
            </div>

          </CardContent>
        </Card>
      )}
    </div>
  );
}
