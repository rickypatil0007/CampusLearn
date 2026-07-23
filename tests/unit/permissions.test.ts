import { describe, it, expect } from "vitest";
import { can } from "@/lib/permissions/permissions";
import { ROLES } from "@/lib/permissions/roles";

describe("role-permission matrix", () => {
  it("allows students to attempt quizzes but not create them", () => {
    expect(can("student", "quiz.attempt")).toBe(true);
    expect(can("student", "quiz.create")).toBe(false);
  });

  it("allows faculty to approve resources; students cannot", () => {
    expect(can("faculty", "resource.approve")).toBe(true);
    expect(can("student", "resource.approve")).toBe(false);
    expect(can("class_rep", "resource.approve")).toBe(false);
  });

  it("allows class reps to upload resources; students cannot", () => {
    expect(can("class_rep", "resource.upload")).toBe(true);
    expect(can("student", "resource.upload")).toBe(false);
  });

  it("only dept_admin/super_admin can assign faculty or admin roles", () => {
    expect(can("dept_admin", "role.assign_faculty_or_admin")).toBe(true);
    expect(can("super_admin", "role.assign_faculty_or_admin")).toBe(true);
    expect(can("faculty", "role.assign_faculty_or_admin")).toBe(false);
    expect(can("class_rep", "role.assign_faculty_or_admin")).toBe(false);
  });

  it("only super_admin can assign the super_admin role", () => {
    for (const role of ROLES) {
      expect(can(role, "role.assign_super_admin")).toBe(role === "super_admin");
    }
  });

  it("faculty and admins (not students) can grade assignments", () => {
    expect(can("faculty", "assignment.grade")).toBe(true);
    expect(can("dept_admin", "assignment.grade")).toBe(true);
    expect(can("student", "assignment.grade")).toBe(false);
  });

  it("every role can use the AI assistant", () => {
    for (const role of ROLES) {
      expect(can(role, "ai.use_assistant")).toBe(true);
    }
  });

  it("only faculty/admins can draft AI quiz questions", () => {
    expect(can("faculty", "ai.draft_quiz")).toBe(true);
    expect(can("student", "ai.draft_quiz")).toBe(false);
    expect(can("class_rep", "ai.draft_quiz")).toBe(false);
  });
});
