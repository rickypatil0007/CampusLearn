import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { getAnthropicClient, CLAUDE_MODEL, estimateCostUsd } from "@/lib/ai/anthropic";
import { checkRateLimit } from "@/lib/rate-limit";

interface StudyPlanRequest {
  examDate: string; subjectIds: string[]; dailyHours: number;
  confidenceBySubject: Record<string, number>; preferredDays: string[];
}

export async function POST(request: Request) {
  try {
    const user = await requirePermission("ai.use_assistant");
    const body = (await request.json()) as StudyPlanRequest;

    const rl = await checkRateLimit(`ai:study-plan:${user.id}`, 5, 24 * 60 * 60 * 1000);
    if (!rl.allowed) return NextResponse.json({ error: "Daily AI request limit reached." }, { status: 429 });

    const supabase = await createClient();
    const { data: subjects } = await supabase.from("subjects").select("id, name").in("id", body.subjectIds);

    const anthropic = getAnthropicClient();
    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL, max_tokens: 2000,
      system: `You are a study planner. Produce a day-by-day plan from today until the exam date as JSON: {"days":[{"date":"YYYY-MM-DD","tasks":[{"subject":string,"title":string,"type":"topic_review"|"revision"|"quiz_session"|"assignment"|"mock_test","durationMinutes":number}]}]}. Respect the student's daily available hours and per-subject confidence (lower confidence = more time). Respond ONLY with JSON.`,
      messages: [{
        role: "user",
        content: `Exam date: ${body.examDate}. Daily hours available: ${body.dailyHours}. Preferred study days: ${body.preferredDays.join(", ")}. Subjects and confidence (1-5, 1=low): ${(subjects ?? []).map((s) => `${s.name}: ${body.confidenceBySubject[s.id] ?? 3}`).join("; ")}`,
      }],
    });

    const text = response.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("The AI did not return a valid plan. Try again.");
    const parsed = JSON.parse(jsonMatch[0]) as { days: { date: string; tasks: { subject: string; title: string; type: string; durationMinutes: number }[] }[] };

    const { data: plan, error } = await supabase.from("study_plans").insert({
      student_id: user.id, title: `Study plan — exam ${body.examDate}`, exam_date: body.examDate,
      daily_hours: body.dailyHours, preferred_days: body.preferredDays,
    }).select("id").single();
    if (error || !plan) throw new Error(error?.message ?? "Could not save plan.");

    const subjectByName = new Map((subjects ?? []).map((s) => [s.name, s.id]));
    const tasks = parsed.days.flatMap((day) =>
      day.tasks.map((t, i) => ({
        study_plan_id: plan.id, subject_id: subjectByName.get(t.subject) ?? null, task_type: t.type,
        title: t.title, scheduled_date: day.date, duration_minutes: t.durationMinutes, sequence: i + 1,
      }))
    );
    if (tasks.length) await supabase.from("study_plan_tasks").insert(tasks);

    await supabase.from("ai_usage_logs").insert({ user_id: user.id, feature: "study_planner", input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens, estimated_cost_usd: estimateCostUsd(response.usage.input_tokens, response.usage.output_tokens) });

    return NextResponse.json({ planId: plan.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Study plan generation failed." }, { status: 500 });
  }
}
