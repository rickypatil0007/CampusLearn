import { z } from "zod";

export const institutionSettingsSchema = z.object({
  aiFeaturesEnabled: z.boolean(),
  maxUploadSizeMb: z.coerce.number().int().min(1).max(200),
  aiRequestsPerUserPerDay: z.coerce.number().int().min(1).max(1000),
});
export type InstitutionSettingsInput = z.infer<typeof institutionSettingsSchema>;

export const inviteStaffSchema = z.object({
  email: z.string().trim().toLowerCase().email().regex(/^[a-z]+\.[a-z]+@tcetmumbai\.in$/, "Email must be in the format firstname.lastname@tcetmumbai.in"),
  fullName: z.string().trim().min(2).max(120),
  role: z.enum(["faculty", "dept_admin"]),
  departmentId: z.string().uuid().optional(),
});
export type InviteStaffInput = z.infer<typeof inviteStaffSchema>;
