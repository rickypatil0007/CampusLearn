import { requireRoleOrRedirect } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireRoleOrRedirect(["dept_admin", "super_admin"]);
  return <>{children}</>;
}
