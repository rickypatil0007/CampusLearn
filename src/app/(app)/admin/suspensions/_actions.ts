"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/app/auth/actions";
import { z } from "zod";

const suspendSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1, "Reason is required"),
});

export async function toggleSuspensionAction(input: unknown): Promise<ActionResult> {
  const adminProfile = await requirePermission("user.suspend");
  const parsed = suspendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const { userId, reason } = parsed.data;

  // Check if they are trying to suspend a super_admin
  const admin = createAdminClient();
  const { data: targetProfile } = await admin.from("profiles").select("role, is_suspended").eq("id", userId).single();
  
  if (!targetProfile) return { ok: false, error: "User not found" };
  if (targetProfile.role === "super_admin" && adminProfile.role !== "super_admin") {
    return { ok: false, error: "You cannot suspend a super admin." };
  }

  const newSuspendedState = !targetProfile.is_suspended;
  
  const { error } = await admin.from("profiles").update({ is_suspended: newSuspendedState }).eq("id", userId);
  
  if (error) return { ok: false, error: error.message };

  await admin.from("audit_logs").insert({
    actor_id: adminProfile.id,
    action: newSuspendedState ? "user_suspend" : "user_unsuspend",
    target_table: "profiles",
    target_id: userId,
  });

  if (newSuspendedState) {
    // If we just suspended them, sign them out using auth admin API? 
    // Actually, sign-out forces them to logout on their next request when their session refreshes,
    // but the next.js middleware check will catch them anyway because of the DB trigger or session checks.
    // It's safest to just rely on next time they hit an authenticated route, or we can't easily sign them out here without their refresh token.
    // However, our middleware or login checks handle it. 
  }

  revalidatePath("/admin/suspensions");
  revalidatePath("/admin/users");
  
  return { ok: true, data: undefined };
}
