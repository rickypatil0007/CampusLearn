import { describe, it, expect } from "vitest";
import { scoreQuizAttempt, type ScoringQuestion, type ScoringOption, type ScoringAnswer } from "@/lib/quiz/scoring";

describe("scoreQuizAttempt", () => {
  const questions: ScoringQuestion[] = [
    { id: "q1", marks: 2, topicId: "t1", questionType: "mcq_single" },
    { id: "q2", marks: 1, topicId: "t1", questionType: "true_false" },
    { id: "q3", marks: 3, topicId: "t2", questionType: "mcq_multiple" },
    { id: "q4", marks: 5, topicId: "t3", questionType: "descriptive" },
  ];

  const options: ScoringOption[] = [
    { id: "q1-a", questionId: "q1", isCorrect: true },
    { id: "q1-b", questionId: "q1", isCorrect: false },
    { id: "q2-true", questionId: "q2", isCorrect: true },
    { id: "q2-false", questionId: "q2", isCorrect: false },
    { id: "q3-a", questionId: "q3", isCorrect: true },
    { id: "q3-b", questionId: "q3", isCorrect: true },
    { id: "q3-c", questionId: "q3", isCorrect: false },
  ];

  it("awards full marks for a fully correct single-answer MCQ", () => {
    const answers: ScoringAnswer[] = [{ questionId: "q1", selectedOptionIds: ["q1-a"] }];
    const result = scoreQuizAttempt([questions[0]], options, answers);
    expect(result.marksObtained).toBe(2);
    expect(result.perQuestion[0].isCorrect).toBe(true);
  });

  it("awards zero marks for a wrong single-answer MCQ", () => {
    const answers: ScoringAnswer[] = [{ questionId: "q1", selectedOptionIds: ["q1-b"] }];
    const result = scoreQuizAttempt([questions[0]], options, answers);
    expect(result.marksObtained).toBe(0);
  });

  it("requires ALL correct options selected (and no extras) for multi-select", () => {
    const partial = scoreQuizAttempt([questions[2]], options, [{ questionId: "q3", selectedOptionIds: ["q3-a"] }]);
    expect(partial.perQuestion[0].isCorrect).toBe(false);

    const extra = scoreQuizAttempt([questions[2]], options, [{ questionId: "q3", selectedOptionIds: ["q3-a", "q3-b", "q3-c"] }]);
    expect(extra.perQuestion[0].isCorrect).toBe(false);

    const exact = scoreQuizAttempt([questions[2]], options, [{ questionId: "q3", selectedOptionIds: ["q3-b", "q3-a"] }]);
    expect(exact.perQuestion[0].isCorrect).toBe(true);
    expect(exact.marksObtained).toBe(3);
  });

  it("treats an unanswered question as incorrect with zero marks", () => {
    const result = scoreQuizAttempt([questions[0]], options, []);
    expect(result.perQuestion[0].isCorrect).toBe(false);
    expect(result.marksObtained).toBe(0);
  });

  it("never auto-grades descriptive questions", () => {
    const result = scoreQuizAttempt([questions[3]], [], [{ questionId: "q4", selectedOptionIds: [] }]);
    expect(result.perQuestion[0].isCorrect).toBe(false);
    expect(result.marksObtained).toBe(0);
    expect(result.totalMarks).toBe(5);
  });

  it("computes total marks, accuracy, and weak/strong topics across a full attempt", () => {
    const answers: ScoringAnswer[] = [
      { questionId: "q1", selectedOptionIds: ["q1-a"] }, // correct, 2 marks, topic t1
      { questionId: "q2", selectedOptionIds: ["q2-false"] }, // incorrect, topic t1
      { questionId: "q3", selectedOptionIds: ["q3-a", "q3-b"] }, // correct, 3 marks, topic t2
    ];
    const result = scoreQuizAttempt(questions.slice(0, 3), options, answers);
    expect(result.totalMarks).toBe(6);
    expect(result.marksObtained).toBe(5);
    expect(result.accuracy).toBeCloseTo((5 / 6) * 100, 5);
    expect(result.strongTopicIds).toContain("t2");
    // t1 has one correct (q1) and one incorrect (q2) sub-question — the
    // topic ends up in both sets since correctness is tracked per question,
    // giving Faculty/Students a granular signal rather than an averaged one.
    expect(result.weakTopicIds).toContain("t1");
    expect(result.strongTopicIds).toContain("t1");
  });

  it("returns zero accuracy for a zero-mark quiz without dividing by zero", () => {
    const result = scoreQuizAttempt([], [], []);
    expect(result.totalMarks).toBe(0);
    expect(result.accuracy).toBe(0);
  });
});
