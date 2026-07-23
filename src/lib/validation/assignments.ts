import { z } from "zod";

export const assignmentSchema = z.object({
  title: z.string().trim().min(3).max(200),
  instructions: z.string().trim().max(3000).optional().or(z.literal("")),
  subjectId: z.string().uuid(),
  maxMarks: z.coerce.number().min(1).max(1000).default(100),
  dueAt: z.string().min(1, "Due date is required."),
  allowMultipleFiles: z.boolean().default(true),
  allowResubmission: z.boolean().default(false),
  lateSubmissionAllowed: z.boolean().default(false),
});
export type AssignmentInput = z.infer<typeof assignmentSchema>;

export const gradeSubmissionSchema = z.object({
  submissionId: z.string().uuid(),
  marksObtained: z.coerce.number().min(0),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
  requestResubmission: z.boolean().optional(),
});
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
