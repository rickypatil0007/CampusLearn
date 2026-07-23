import { z } from "zod";

export const departmentSchema = z.object({
  name: z.string().trim().min(2).max(120),
  code: z.string().trim().toUpperCase().min(1).max(20),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type DepartmentInput = z.infer<typeof departmentSchema>;

export const programmeSchema = z.object({
  departmentId: z.string().uuid(),
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().toUpperCase().min(1).max(20),
  durationYears: z.coerce.number().int().min(1).max(6),
});
export type ProgrammeInput = z.infer<typeof programmeSchema>;

export const subjectSchema = z.object({
  name: z.string().trim().min(2).max(150),
  code: z.string().trim().toUpperCase().min(1).max(20),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  credits: z.coerce.number().int().min(1).max(10),
  departmentId: z.string().uuid(),
  semesterId: z.string().uuid(),
});
export type SubjectInput = z.infer<typeof subjectSchema>;

export const assignRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["student", "class_rep", "faculty", "dept_admin", "super_admin"]),
  scopeDepartmentId: z.string().uuid().optional(),
  scopeDivisionId: z.string().uuid().optional(),
});
export type AssignRoleInput = z.infer<typeof assignRoleSchema>;

export const academicYearSchema = z.object({
  label: z.string().trim().min(4).max(50),
  isCurrent: z.boolean().default(false),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
});
export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const yearOfStudySchema = z.object({
  name: z.string().trim().min(2).max(50),
  level: z.coerce.number().int().min(1).max(10),
});
export type YearOfStudyInput = z.infer<typeof yearOfStudySchema>;

export const semesterSchema = z.object({
  programmeId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  yearOfStudyId: z.string().uuid(),
  number: z.coerce.number().int().min(1).max(20),
  name: z.string().trim().min(2).max(50),
});
export type SemesterInput = z.infer<typeof semesterSchema>;

export const divisionSchema = z.object({
  semesterId: z.string().uuid(),
  name: z.string().trim().toUpperCase().min(1).max(10),
});
export type DivisionInput = z.infer<typeof divisionSchema>;

