import type { Role } from "@/lib/permissions/roles";

/**
 * Pure resource-approval-workflow rules, extracted from the resource
 * Server Actions (src/app/(app)/resources/_actions.ts).
 */
export function determineInitialApprovalStatus(uploaderRole: Role): "approved" | "pending" {
  return uploaderRole === "faculty" || uploaderRole === "dept_admin" || uploaderRole === "super_admin" ? "approved" : "pending";
}

export function canDeleteResource(params: {
  callerRole: Role;
  callerId: string;
  uploadedBy: string;
  approvalStatus: "pending" | "approved" | "rejected" | "changes_requested";
}): boolean {
  const isFacultyOrAdmin = params.callerRole === "faculty" || params.callerRole === "dept_admin" || params.callerRole === "super_admin";
  if (isFacultyOrAdmin) return true;
  return params.callerId === params.uploadedBy && params.approvalStatus === "pending";
}

export function isVisibleToStudent(approvalStatus: "pending" | "approved" | "rejected" | "changes_requested"): boolean {
  return approvalStatus === "approved";
}
