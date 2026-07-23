"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { institutionSettingsSchema } from "@/lib/validation/settings";
import type { ActionResult } from "@/app/auth/actions";

export async function updateInstitutionSettingsAction(input: unknown): Promise<ActionResult> {
  const user = await requirePermission("institution.manage_settings");
  const parsed = institutionSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid settings." };

  const supabase = await createClient();
  const { data: existing } = await supabase.from("institution_settings").select("id").limit(1).maybeSingle();

  const payload = {
    ai_features_enabled: parsed.data.aiFeaturesEnabled,
    max_upload_size_mb: parsed.data.maxUploadSizeMb,
    ai_requests_per_user_per_day: parsed.data.aiRequestsPerUserPerDay,
    updated_by: user.id,
  };

  const { error } = existing
    ? await supabase.from("institution_settings").update(payload).eq("id", existing.id)
    : await supabase.from("institution_settings").insert(payload);
  if (error) return { ok: false, error: error.message };

  await supabase.from("audit_logs").insert({ actor_id: user.id, action: "settings_change", target_table: "institution_settings", metadata: payload });

  revalidatePath("/admin/settings");
  return { ok: true, data: undefined };
}
