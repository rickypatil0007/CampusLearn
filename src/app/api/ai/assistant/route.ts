import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth/session";
import { answerGroundedQuestion } from "@/lib/ai/rag";

export async function POST(request: Request) {
  try {
    const user = await requirePermission("ai.use_assistant");
    const { question, subjectId } = (await request.json()) as { question: string; subjectId?: string };

    if (!question || question.trim().length < 3) {
      return NextResponse.json({ error: "Enter a more detailed question." }, { status: 400 });
    }
    if (question.length > 2000) {
      return NextResponse.json({ error: "Question is too long." }, { status: 400 });
    }

    const result = await answerGroundedQuestion(user, question.trim(), subjectId || undefined);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "The AI assistant is unavailable." }, { status: 500 });
  }
}
