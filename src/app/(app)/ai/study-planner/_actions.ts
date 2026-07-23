"use server";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/app/auth/actions";

export async function toggleTaskCompleteAction(taskId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: task } = await supabase.from("study_plan_tasks").select("id, is_complete, study_plans!inner(student_id)").eq("id", taskId).single();
  if (!task || (task.study_plans as unknown as { student_id: string }).student_id !== user.id) return { ok: false, error: "Not your task." };
  const { error } = await supabase.from("study_plan_tasks").update({ is_complete: !task.is_complete }).eq("id", taskId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/ai/study-planner");
  return { ok: true, data: undefined };
}
