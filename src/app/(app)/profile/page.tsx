import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/permissions/roles";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email, roll_number, departments:department_id(name), programmes:programme_id(name), semesters:semester_id(name), divisions:division_id(name)")
    .eq("id", user.id)
    .single();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Profile</h1>
        <p className="text-sm text-muted-foreground">{ROLE_LABELS[user.role]}</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent><ProfileForm initialName={profile?.full_name ?? ""} email={profile?.email ?? user.email} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Academic details</CardTitle><CardDescription>Managed by your Department Administrator.</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 text-sm">
          <div><p className="font-mono-label text-muted-foreground">Department</p><p className="text-foreground">{(profile?.departments as unknown as { name: string } | null)?.name ?? "—"}</p></div>
          <div><p className="font-mono-label text-muted-foreground">Programme</p><p className="text-foreground">{(profile?.programmes as unknown as { name: string } | null)?.name ?? "—"}</p></div>
          <div><p className="font-mono-label text-muted-foreground">Semester</p><p className="text-foreground">{(profile?.semesters as unknown as { name: string } | null)?.name ?? "—"}</p></div>
          <div><p className="font-mono-label text-muted-foreground">Division</p><p className="text-foreground">{(profile?.divisions as unknown as { name: string } | null)?.name ?? "—"}</p></div>
          <div><p className="font-mono-label text-muted-foreground">Roll Number</p><p className="text-foreground">{profile?.roll_number ?? "—"}</p></div>
        </CardContent>
      </Card>
    </div>
  );
}
