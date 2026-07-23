import { describe, it, expect } from "vitest";
import { determineInitialApprovalStatus, isVisibleToStudent, canDeleteResource } from "@/lib/resources/rules";
import { can } from "@/lib/permissions/permissions";

/**
 * Exercises the CR-upload → pending → Faculty-review → approved/rejected
 * pipeline end-to-end at the business-logic layer.
 */
describe("CR resource approval workflow", () => {
  it("a CR upload starts pending and is not visible to students until approved", () => {
    expect(can("class_rep", "resource.upload")).toBe(true);
    const status = determineInitialApprovalStatus("class_rep");
    expect(status).toBe("pending");
    expect(isVisibleToStudent(status)).toBe(false);
  });

  it("only Faculty/Admins can approve; the CR who uploaded it cannot self-approve", () => {
    expect(can("faculty", "resource.approve")).toBe(true);
    expect(can("class_rep", "resource.approve")).toBe(false);
  });

  it("once approved, the resource becomes visible to students", () => {
    expect(isVisibleToStudent("approved")).toBe(true);
  });

  it("a Faculty upload is auto-approved and visible immediately", () => {
    const status = determineInitialApprovalStatus("faculty");
    expect(status).toBe("approved");
    expect(isVisibleToStudent(status)).toBe(true);
  });

  it("the CR can delete their own submission only while it is still pending", () => {
    expect(canDeleteResource({ callerRole: "class_rep", callerId: "cr-1", uploadedBy: "cr-1", approvalStatus: "pending" })).toBe(true);
    expect(canDeleteResource({ callerRole: "class_rep", callerId: "cr-1", uploadedBy: "cr-1", approvalStatus: "approved" })).toBe(false);
  });
});
