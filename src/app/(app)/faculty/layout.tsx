import { requireRoleOrRedirect } from "@/lib/auth/session";

export default async function FacultyLayout({ children }: { children: React.ReactNode }) {
  // Route-prefix gate for UX; every Server Action underneath independently
  // re-checks permissions via requirePermission() (see lib/permissions).
  await requireRoleOrRedirect(["faculty", "dept_admin", "super_admin"]);
  return <>{children}</>;
}
