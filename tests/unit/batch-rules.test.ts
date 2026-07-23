import { describe, it, expect } from "vitest";
import { authorizeClassScopesForUpload, crCanUploadToScopes, type ClassScopeKey } from "@/lib/resources/batch-rules";

const classA: ClassScopeKey = { department_id: "d1", programme_id: "p1", academic_year_id: "a1", semester_id: "s1", division_id: "div-A" };
const classB: ClassScopeKey = { department_id: "d1", programme_id: "p1", academic_year_id: "a1", semester_id: "s1", division_id: "div-B" };
const classC: ClassScopeKey = { department_id: "d1", programme_id: "p1", academic_year_id: "a1", semester_id: "s1", division_id: "div-C" };

describe("authorizeClassScopesForUpload", () => {
  it("allows dept_admin/super_admin for any requested scope without assignment data", () => {
    expect(authorizeClassScopesForUpload("dept_admin", [], [classA, classB]).ok).toBe(true);
    expect(authorizeClassScopesForUpload("super_admin", [], [classC]).ok).toBe(true);
  });

  it("allows faculty when every requested class is in their assigned set", () => {
    const result = authorizeClassScopesForUpload("faculty", [classA, classB], [classA, classB]);
    expect(result.ok).toBe(true);
    expect(result.unauthorized).toHaveLength(0);
  });

  it("rejects faculty when one requested class is not assigned, reporting exactly the unauthorized ones", () => {
    const result = authorizeClassScopesForUpload("faculty", [classA], [classA, classC]);
    expect(result.ok).toBe(false);
    expect(result.unauthorized).toEqual([classC]);
  });

  it("rejects a role with no upload capability outright", () => {
    const result = authorizeClassScopesForUpload("student", [], [classA]);
    expect(result.ok).toBe(false);
    expect(result.unauthorized).toEqual([classA]);
  });

  it("rejects class_rep for a class outside their single assigned class", () => {
    const result = authorizeClassScopesForUpload("class_rep", [classA], [classB]);
    expect(result.ok).toBe(false);
  });
});

describe("crCanUploadToScopes", () => {
  it("allows exactly one matching scope", () => {
    expect(crCanUploadToScopes(classA, [classA])).toBe(true);
  });

  it("rejects when the CR has no active class assignment", () => {
    expect(crCanUploadToScopes(null, [classA])).toBe(false);
  });

  it("rejects multiple requested scopes even if one matches", () => {
    expect(crCanUploadToScopes(classA, [classA, classB])).toBe(false);
  });

  it("rejects a scope that does not match the CR's own class", () => {
    expect(crCanUploadToScopes(classA, [classB])).toBe(false);
  });
});
