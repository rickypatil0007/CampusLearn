import { describe, it, expect } from "vitest";
import { determineInitialApprovalStatus, canDeleteResource, isVisibleToStudent } from "@/lib/resources/rules";

describe("determineInitialApprovalStatus", () => {
  it("auto-approves Faculty, Department Admin, and Super Admin uploads", () => {
    expect(determineInitialApprovalStatus("faculty")).toBe("approved");
    expect(determineInitialApprovalStatus("dept_admin")).toBe("approved");
    expect(determineInitialApprovalStatus("super_admin")).toBe("approved");
  });

  it("marks Class Representative uploads as pending", () => {
    expect(determineInitialApprovalStatus("class_rep")).toBe("pending");
  });
});

describe("canDeleteResource", () => {
  it("lets the owner delete their own pending submission", () => {
    expect(canDeleteResource({ callerRole: "class_rep", callerId: "u1", uploadedBy: "u1", approvalStatus: "pending" })).toBe(true);
  });

  it("does not let the owner delete their own already-approved submission", () => {
    expect(canDeleteResource({ callerRole: "class_rep", callerId: "u1", uploadedBy: "u1", approvalStatus: "approved" })).toBe(false);
  });

  it("does not let a student delete someone else's submission", () => {
    expect(canDeleteResource({ callerRole: "student", callerId: "u2", uploadedBy: "u1", approvalStatus: "pending" })).toBe(false);
  });

  it("lets Faculty delete any resource", () => {
    expect(canDeleteResource({ callerRole: "faculty", callerId: "u2", uploadedBy: "u1", approvalStatus: "approved" })).toBe(true);
  });
});

describe("isVisibleToStudent", () => {
  it("only approved resources are visible", () => {
    expect(isVisibleToStudent("approved")).toBe(true);
    expect(isVisibleToStudent("pending")).toBe(false);
    expect(isVisibleToStudent("rejected")).toBe(false);
    expect(isVisibleToStudent("changes_requested")).toBe(false);
  });
});
