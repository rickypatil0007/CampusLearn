import type { Role } from "@/lib/permissions/roles";

export interface ClassScopeKey {
  department_id: string;
  programme_id: string;
  academic_year_id: string;
  semester_id: string;
  division_id: string;
}

function scopeKey(s: ClassScopeKey): string {
  return [s.department_id, s.programme_id, s.academic_year_id, s.semester_id, s.division_id].join("|");
}

/**
 * Pure authorization check for the multi-class upload batch flow (spec
 * section 11), extracted from the Server Action so it can be unit tested
 * without a database. `assignedScopes` is whatever the caller is already
 * allowed to act on for the batch's subject (their active
 * faculty_teaching_assignments / class_representative_assignments rows,
 * already fetched by the caller); `requestedScopes` is what the upload form
 * submitted. Dept/Super admins are authorized for anything (checked by the
 * caller before invoking this, since it needs no scope data for them).
 */
export function authorizeClassScopesForUpload(
  role: Role,
  assignedScopes: ClassScopeKey[],
  requestedScopes: ClassScopeKey[]
): { ok: boolean; unauthorized: ClassScopeKey[] } {
  if (role === "dept_admin" || role === "super_admin") {
    return { ok: true, unauthorized: [] };
  }
  if (role !== "faculty" && role !== "class_rep") {
    return { ok: false, unauthorized: requestedScopes };
  }
  const assignedKeys = new Set(assignedScopes.map(scopeKey));
  const unauthorized = requestedScopes.filter((s) => !assignedKeys.has(scopeKey(s)));
  return { ok: unauthorized.length === 0, unauthorized };
}

/** A Class Representative may only ever target their own single class -- if
 * they have more than one requested scope, or it isn't their assigned one,
 * reject outright rather than silently intersecting. */
export function crCanUploadToScopes(crOwnScope: ClassScopeKey | null, requestedScopes: ClassScopeKey[]): boolean {
  if (!crOwnScope) return false;
  if (requestedScopes.length !== 1) return false;
  return scopeKey(crOwnScope) === scopeKey(requestedScopes[0]);
}
