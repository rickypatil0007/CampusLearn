import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { ROLE_LABELS } from "@/lib/permissions/roles";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const [{ count: unreadCount }, { data: profile }] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_read", false),
    supabase
      .from("profiles")
      .select("department_id, semester_id, division_id, departments:department_id(code), semesters:semester_id(number), divisions:division_id(name)")
      .eq("id", user.id)
      .maybeSingle(),
  ]);

  let academicContext: string | undefined;
  const p = profile as unknown as {
    departments?: { code: string } | null;
    semesters?: { number: number } | null;
    divisions?: { name: string } | null;
  } | null;
  if (p?.departments || p?.semesters || p?.divisions) {
    academicContext = [
      p.departments?.code,
      p.semesters?.number ? `Sem ${p.semesters.number}` : null,
      p.divisions?.name ? `Div ${p.divisions.name}` : null,
    ]
      .filter(Boolean)
      .join(" · ");
  } else {
    academicContext = ROLE_LABELS[user.role];
  }

  return (
    <AppShell
      role={user.role}
      headerUser={{ fullName: user.fullName, email: user.email, role: user.role, academicContext }}
      unreadCount={unreadCount ?? 0}
    >
      {children}
    </AppShell>
  );
}
