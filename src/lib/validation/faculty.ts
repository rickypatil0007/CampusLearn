import { z } from "zod";

export const inviteFacultySchema = z.object({
  fullName: z.string().trim().min(2, "Enter the Faculty member's full name.").max(120),
  email: z.string().trim().toLowerCase().email("Invalid email").regex(/^[a-z]+\.[a-z]+@tcetmumbai\.in$/, "Email must be firstname.lastname@tcetmumbai.in"),
  departmentId: z.string().uuid("Select a department."),
});
export type InviteFacultyInput = z.infer<typeof inviteFacultySchema>;

export const teachingAssignmentSchema = z.object({
  facultyId: z.string().uuid(),
  subjectId: z.string().uuid(),
  departmentId: z.string().uuid(),
  programmeId: z.string().uuid(),
  academicYearId: z.string().uuid(),
  yearOfStudyId: z.string().uuid().optional().or(z.literal("")),
  semesterId: z.string().uuid(),
  divisionId: z.string().uuid(),
});
export type TeachingAssignmentInput = z.infer<typeof teachingAssignmentSchema>;
