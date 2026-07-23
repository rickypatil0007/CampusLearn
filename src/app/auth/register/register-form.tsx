"use client";

import { useMemo, useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "@/lib/validation/auth";
import { registerAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription,
} from "@/components/ui/form";

interface Option { id: string; name?: string; label?: string; code?: string; number?: number }

interface RegisterFormProps {
  departments: Option[];
  programmes: (Option & { department_id: string })[];
  academicYears: Option[];
  yearsOfStudy: Option[];
  semesters: (Option & { programme_id: string; academic_year_id: string; year_of_study_id: string })[];
  divisions: (Option & { semester_id: string })[];
}

export function RegisterForm({ departments, programmes, academicYears, yearsOfStudy, semesters, divisions }: RegisterFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<string | null>(null);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "", studentId: "", email: "", password: "", confirmPassword: "",
      departmentId: "", programmeId: "", academicYearId: "", yearOfStudyId: "", semesterId: "", divisionId: "",
      rollNumber: "", acceptedTerms: false as unknown as true,
    },
  });

  const studentId = form.watch("studentId");
  const departmentId = form.watch("departmentId");
  const programmeId = form.watch("programmeId");
  const academicYearId = form.watch("academicYearId");
  const yearOfStudyId = form.watch("yearOfStudyId");
  const semesterId = form.watch("semesterId");

  useEffect(() => {
    if (studentId && studentId.length > 1) {
      const derived = `${studentId.substring(1).toLowerCase()}@tcetmumbai.in`;
      form.setValue("email", derived, { shouldValidate: true });
    } else {
      form.setValue("email", "", { shouldValidate: true });
    }
  }, [studentId, form]);

  const filteredProgrammes = useMemo(
    () => programmes.filter((p) => p.department_id === departmentId),
    [programmes, departmentId]
  );
  
  const filteredSemesters = useMemo(
    () => semesters.filter((s) => s.programme_id === programmeId && s.academic_year_id === academicYearId && s.year_of_study_id === yearOfStudyId),
    [semesters, programmeId, academicYearId, yearOfStudyId]
  );
  
  const filteredDivisions = useMemo(
    () => divisions.filter((d) => d.semester_id === semesterId),
    [divisions, semesterId]
  );

  function onSubmit(values: RegisterInput) {
    setServerError(null);
    startTransition(async () => {
      const result = await registerAction(values);
      if (!result.ok) {
        setServerError(result.error);
        toast.error(result.error);
        return;
      }
      setSubmitted(result.data.email);
      toast.success("Check your inbox to verify your account.");
      router.push(`/auth/verify-email?email=${encodeURIComponent(result.data.email)}`);
    });
  }

  if (submitted) {
    return (
      <Alert variant="success">
        <AlertDescription>
          We sent a verification link to <strong>{submitted}</strong>. Verify your email to activate your account.
        </AlertDescription>
      </Alert>
    );
  }

  if (departments.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertDescription>No academic structure has been configured yet. Please contact an Administrator.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {serverError && (
          <Alert variant="destructive">
            <AlertDescription>{serverError}</AlertDescription>
          </Alert>
        )}

        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem>
            <FormLabel>Full name</FormLabel>
            <FormControl><Input placeholder="Ananya Sharma" autoComplete="name" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="studentId" render={({ field }) => (
            <FormItem>
              <FormLabel>Student ID</FormLabel>
              <FormControl><Input placeholder="S1032250917" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Generated email</FormLabel>
              <FormControl><Input type="email" readOnly disabled placeholder="Auto-generated" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="password" render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="confirmPassword" render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="departmentId" render={({ field }) => (
          <FormItem>
            <FormLabel>Department</FormLabel>
            <Select onValueChange={(v) => { field.onChange(v); form.setValue("programmeId", ""); form.setValue("semesterId", ""); form.setValue("divisionId", ""); }} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
              <SelectContent>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="programmeId" render={({ field }) => (
          <FormItem>
            <FormLabel>Programme</FormLabel>
            <Select onValueChange={(v) => { field.onChange(v); form.setValue("semesterId", ""); form.setValue("divisionId", ""); }} value={field.value} disabled={!departmentId}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select programme" /></SelectTrigger></FormControl>
              <SelectContent>
                {filteredProgrammes.length === 0 ? <SelectItem value="empty" disabled>No programmes available</SelectItem> : filteredProgrammes.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="academicYearId" render={({ field }) => (
            <FormItem>
              <FormLabel>Academic Session</FormLabel>
              <Select onValueChange={(v) => { field.onChange(v); form.setValue("semesterId", ""); form.setValue("divisionId", ""); }} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select session" /></SelectTrigger></FormControl>
                <SelectContent>
                  {academicYears.map((y) => <SelectItem key={y.id} value={y.id}>{y.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="yearOfStudyId" render={({ field }) => (
            <FormItem>
              <FormLabel>Year of Study</FormLabel>
              <Select onValueChange={(v) => { field.onChange(v); form.setValue("semesterId", ""); form.setValue("divisionId", ""); }} value={field.value}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger></FormControl>
                <SelectContent>
                  {yearsOfStudy.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="semesterId" render={({ field }) => (
            <FormItem>
              <FormLabel>Semester</FormLabel>
              <Select onValueChange={(v) => { field.onChange(v); form.setValue("divisionId", ""); }} value={field.value} disabled={!programmeId || !academicYearId || !yearOfStudyId}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                <SelectContent>
                  {filteredSemesters.length === 0 ? <SelectItem value="empty" disabled>No semesters available</SelectItem> : filteredSemesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="divisionId" render={({ field }) => (
            <FormItem>
              <FormLabel>Division</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={!semesterId}>
                <FormControl><SelectTrigger><SelectValue placeholder="Select division" /></SelectTrigger></FormControl>
                <SelectContent>
                  {filteredDivisions.length === 0 ? <SelectItem value="empty" disabled>No divisions available</SelectItem> : filteredDivisions.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="rollNumber" render={({ field }) => (
          <FormItem>
            <FormLabel>Roll number</FormLabel>
            <FormControl><Input placeholder="e.g. 01" {...field} /></FormControl>
            <FormDescription>Format: 01 to 70.</FormDescription>
            <FormMessage />
          </FormItem>
        )} />

        <FormField control={form.control} name="acceptedTerms" render={({ field }) => (
          <FormItem className="flex flex-row items-start gap-2 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={field.onChange} id="acceptedTerms" />
            </FormControl>
            <FormLabel htmlFor="acceptedTerms" className="cursor-pointer font-normal text-sm">
              I accept the <a href="/terms" className="text-primary hover:underline" target="_blank">Terms</a> and{" "}
              <a href="/privacy" className="text-primary hover:underline" target="_blank">Privacy Policy</a>.
            </FormLabel>
          </FormItem>
        )} />
        {form.formState.errors.acceptedTerms && (
          <p className="text-xs font-medium text-destructive">{form.formState.errors.acceptedTerms.message}</p>
        )}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Creating account…" : "Create account"}
        </Button>
      </form>
    </Form>
  );
}
