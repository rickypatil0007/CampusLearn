import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { StudentDashboard } from "./student-dashboard";
import { FacultyDashboard } from "./faculty-dashboard";
import { CrDashboard } from "./cr-dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUserOrRedirect();

  if (user.role === "dept_admin" || user.role === "super_admin") redirect("/admin");
  if (user.role === "faculty") return <FacultyDashboard userId={user.id} />;
  if (user.role === "class_rep") return <CrDashboard userId={user.id} />;
  return <StudentDashboard userId={user.id} />;
}
