import { z } from "zod";

export const updateProfileSchema = z.object({ fullName: z.string().trim().min(2).max(120) });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const notificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  resourceUpdates: z.boolean(),
  quizUpdates: z.boolean(),
  assignmentUpdates: z.boolean(),
  announcementUpdates: z.boolean(),
  discussionUpdates: z.boolean(),
});
export type NotificationPreferencesInput = z.infer<typeof notificationPreferencesSchema>;
