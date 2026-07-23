import { z } from "zod";

export const announcementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(3000),
  targetDepartmentId: z.string().uuid().optional().or(z.literal("")),
  targetProgrammeId: z.string().uuid().optional().or(z.literal("")),
  targetAcademicYearId: z.string().uuid().optional().or(z.literal("")),
  targetYearOfStudyId: z.string().uuid().optional().or(z.literal("")),
  targetSemesterId: z.string().uuid().optional().or(z.literal("")),
  targetDivisionId: z.string().uuid().optional().or(z.literal("")),
  targetSubjectId: z.string().uuid().optional().or(z.literal("")),
  priority: z.enum(["normal", "important", "urgent"]).default("normal"),
});
export type AnnouncementInput = z.infer<typeof announcementSchema>;

/** CR announcement form: title/message/priority only -- no target fields.
 * The scope is always derived server-side from the CR's active class
 * assignment (see announcements/_actions.ts), so there is no client input
 * a CR could tamper with to reach another class. */
export const crAnnouncementSchema = z.object({
  title: z.string().trim().min(3).max(200),
  message: z.string().trim().min(3).max(3000),
  priority: z.enum(["normal", "important", "urgent"]).default("normal"),
});
export type CrAnnouncementInput = z.infer<typeof crAnnouncementSchema>;
