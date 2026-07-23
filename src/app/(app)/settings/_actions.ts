"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { notificationPreferencesSchema } from "@/lib/validation/profile";
import type { ActionResult } from "@/app/auth/actions";

export async function updateNotificationPreferencesAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = notificationPreferencesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid preferences." };
  const supabase = await createClient();
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id, email_enabled: parsed.data.emailEnabled, resource_updates: parsed.data.resourceUpdates,
    quiz_updates: parsed.data.quizUpdates, assignment_updates: parsed.data.assignmentUpdates,
    announcement_updates: parsed.data.announcementUpdates, discussion_updates: parsed.data.discussionUpdates,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/settings");
  return { ok: true, data: undefined };
}
