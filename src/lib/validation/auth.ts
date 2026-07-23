import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter.")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter.")
  .regex(/[0-9]/, "Password must contain at least one number.");

export const studentIdSchema = z
  .string()
  .trim()
  .regex(/^S[0-9]{10}$/i, "Student ID must be 'S' followed by 10 digits.")
  .transform((val) => val.toUpperCase());

export const rollNumberSchema = z
  .string()
  .trim()
  .regex(/^(0[1-9]|[1-6][0-9]|70)$/, "Roll number must be between 01 and 70 (e.g., '01', '42').");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name.").max(120),
    studentId: studentIdSchema,
    email: z.string().trim().email("Invalid email").refine(val => val.toLowerCase().endsWith("@tcetmumbai.in"), "Email must end with @tcetmumbai.in"),
    password: passwordSchema,
    confirmPassword: z.string(),
    departmentId: z.string().uuid("Select a department."),
    programmeId: z.string().uuid("Select a programme."),
    academicYearId: z.string().uuid("Select an academic session."),
    yearOfStudyId: z.string().uuid("Select a year of study."),
    semesterId: z.string().uuid("Select a semester."),
    divisionId: z.string().uuid("Select a division."),
    rollNumber: rollNumberSchema,
    acceptedTerms: z.literal(true, {
      errorMap: () => ({ message: "You must accept the Terms and Privacy Policy." }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  })
  .refine((data) => {
    const expectedEmail = `${data.studentId.substring(1).toLowerCase()}@tcetmumbai.in`;
    return data.email.toLowerCase() === expectedEmail;
  }, {
    message: "Email does not match the provided Student ID.",
    path: ["email"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required."),
  password: z.string().min(1, "Password is required."),
  rememberMe: z.boolean().optional().default(false),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
