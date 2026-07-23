import { z } from "zod";

export const quizSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  subjectId: z.string().uuid(),
  targetDepartmentId: z.string().uuid().optional().or(z.literal("")),
  targetProgrammeId: z.string().uuid().optional().or(z.literal("")),
  targetAcademicYearId: z.string().uuid().optional().or(z.literal("")),
  targetYearOfStudyId: z.string().uuid().optional().or(z.literal("")),
  targetSemesterId: z.string().uuid().optional().or(z.literal("")),
  targetDivisionId: z.string().uuid().optional().or(z.literal("")),
  instructions: z.string().trim().max(2000).optional().or(z.literal("")),
  timeLimitMinutes: z.coerce.number().int().min(1).max(300).optional(),
  maxAttempts: z.coerce.number().int().min(1).max(10).default(1),
  passingMarks: z.coerce.number().min(0).optional(),
  dueAt: z.string().optional().or(z.literal("")),
});
export type QuizInput = z.infer<typeof quizSchema>;

export const questionOptionSchema = z.object({
  text: z.string().trim().min(1).max(500),
  isCorrect: z.boolean(),
});

export const questionSchema = z.object({
  quizId: z.string().uuid(),
  questionType: z.enum(["mcq_single", "mcq_multiple", "true_false", "short_answer"]),
  prompt: z.string().trim().min(3).max(1000),
  explanation: z.string().trim().max(1000).optional().or(z.literal("")),
  marks: z.coerce.number().min(0.5).max(100).default(1),
  options: z.array(questionOptionSchema).min(2).max(8).optional(),
});
export type QuestionInput = z.infer<typeof questionSchema>;

export const submitAnswerSchema = z.object({
  attemptId: z.string().uuid(),
  questionId: z.string().uuid(),
  selectedOptionIds: z.array(z.string().uuid()).optional(),
  freeTextAnswer: z.string().trim().max(5000).optional(),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;
