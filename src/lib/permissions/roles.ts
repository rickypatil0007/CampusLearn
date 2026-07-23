export const ROLES = ["student", "class_rep", "faculty", "dept_admin", "super_admin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  student: "Student",
  class_rep: "Class Representative",
  faculty: "Faculty",
  dept_admin: "Department Administrator",
  super_admin: "Super Administrator",
};

/** Roles a person may select at public sign-up. Everything else requires an admin/faculty action. */
export const SELF_REGISTERABLE_ROLES: Role[] = ["student"];

export function isValidRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
