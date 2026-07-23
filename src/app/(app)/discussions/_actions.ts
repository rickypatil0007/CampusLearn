"use server";
import { revalidatePath } from "next/cache";
import { requirePermission, requireUser, UnauthorizedError } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { discussionSchema, replySchema } from "@/lib/validation/discussions";
import type { ActionResult } from "@/app/auth/actions";

export async function createDiscussionAction(input: unknown): Promise<ActionResult<{ discussionId: string }>> {
  const user = await requireUser();
  const parsed = discussionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid question." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("discussions").insert({ subject_id: parsed.data.subjectId, title: parsed.data.title, body: parsed.data.body, created_by: user.id }).select("id").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not post question." };
  revalidatePath("/discussions");
  return { ok: true, data: { discussionId: data.id } };
}

export async function replyToDiscussionAction(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid reply." };
  const supabase = await createClient();
  const isFacultyOrAdmin = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  const { error } = await supabase.from("discussion_replies").insert({ discussion_id: parsed.data.discussionId, body: parsed.data.body, created_by: user.id, is_faculty_verified: isFacultyOrAdmin });
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/discussions/${parsed.data.discussionId}`);
  return { ok: true, data: undefined };
}

export async function upvoteReplyAction(replyId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: existing } = await supabase.from("discussion_votes").select("id").eq("reply_id", replyId).eq("user_id", user.id).maybeSingle();
  if (existing) await supabase.from("discussion_votes").delete().eq("id", existing.id);
  else await supabase.from("discussion_votes").insert({ reply_id: replyId, user_id: user.id });
  return { ok: true, data: undefined };
}

export async function acceptReplyAction(replyId: string, discussionId: string): Promise<ActionResult> {
  await requirePermission("discussion.moderate");
  const supabase = await createClient();
  await supabase.from("discussion_replies").update({ is_accepted: false }).eq("discussion_id", discussionId);
  const { error } = await supabase.from("discussion_replies").update({ is_accepted: true }).eq("id", replyId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/discussions/${discussionId}`);
  return { ok: true, data: undefined };
}

export async function reportContentAction(replyId: string, discussionId: string): Promise<ActionResult> {
  await requireUser();
  const supabase = await createClient();
  await supabase.from("discussion_replies").update({ is_reported: true }).eq("id", replyId);
  revalidatePath(`/discussions/${discussionId}`);
  return { ok: true, data: undefined };
}

export async function deleteDiscussionAction(discussionId: string): Promise<ActionResult> {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: discussion } = await supabase.from("discussions").select("created_by").eq("id", discussionId).single();
  const isFacultyOrAdmin = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  if (!discussion || (discussion.created_by !== user.id && !isFacultyOrAdmin)) throw new UnauthorizedError();
  const { error } = await supabase.from("discussions").delete().eq("id", discussionId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/discussions");
  return { ok: true, data: undefined };
}
