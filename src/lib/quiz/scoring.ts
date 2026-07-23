/**
 * Pure, server-authoritative quiz scoring logic — extracted from
 * submitAttemptAction (src/app/(app)/quizzes/_actions.ts) so it can be unit
 * tested without a database. Given the questions/options/answers already
 * fetched from the DB, computes marks per question and totals. Never trust
 * a client-supplied `isCorrect` value; this function is the only place
 * correctness is decided.
 */

export interface ScoringQuestion {
  id: string;
  marks: number;
  topicId: string | null;
  questionType: "mcq_single" | "mcq_multiple" | "true_false" | "fill_blank" | "short_answer" | "descriptive";
}

export interface ScoringOption {
  id: string;
  questionId: string;
  isCorrect: boolean;
}

export interface ScoringAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuestionScore {
  questionId: string;
  isCorrect: boolean;
  marksAwarded: number;
}

export interface QuizScoreResult {
  totalMarks: number;
  marksObtained: number;
  accuracy: number;
  perQuestion: QuestionScore[];
  weakTopicIds: string[];
  strongTopicIds: string[];
}

const AUTO_GRADABLE_TYPES = new Set(["mcq_single", "mcq_multiple", "true_false"]);

export function scoreQuizAttempt(
  questions: ScoringQuestion[],
  options: ScoringOption[],
  answers: ScoringAnswer[]
): QuizScoreResult {
  let totalMarks = 0;
  let marksObtained = 0;
  const perQuestion: QuestionScore[] = [];
  const weakTopics = new Set<string>();
  const strongTopics = new Set<string>();

  for (const question of questions) {
    totalMarks += question.marks;

    if (!AUTO_GRADABLE_TYPES.has(question.questionType)) {
      // Descriptive / short-answer questions require manual Faculty review;
      // they are not auto-scored here.
      perQuestion.push({ questionId: question.id, isCorrect: false, marksAwarded: 0 });
      continue;
    }

    const answer = answers.find((a) => a.questionId === question.id);
    const correctIds = options.filter((o) => o.questionId === question.id && o.isCorrect).map((o) => o.id).sort();
    const selectedIds = (answer?.selectedOptionIds ?? []).slice().sort();

    const isCorrect =
      correctIds.length > 0 &&
      correctIds.length === selectedIds.length &&
      correctIds.every((id, i) => id === selectedIds[i]);

    const marksAwarded = isCorrect ? question.marks : 0;
    marksObtained += marksAwarded;
    perQuestion.push({ questionId: question.id, isCorrect, marksAwarded });

    if (question.topicId) {
      (isCorrect ? strongTopics : weakTopics).add(question.topicId);
    }
  }

  const accuracy = totalMarks > 0 ? (marksObtained / totalMarks) * 100 : 0;

  return {
    totalMarks, marksObtained, accuracy, perQuestion,
    weakTopicIds: Array.from(weakTopics), strongTopicIds: Array.from(strongTopics),
  };
}
