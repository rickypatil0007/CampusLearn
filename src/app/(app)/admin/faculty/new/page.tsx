import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { InviteFacultyForm } from "./invite-faculty-form";

export const metadata: Metadata = { title: "Invite Faculty" };

export default async function NewFacultyPage() {
  await requirePermission("faculty.manage");
  const supabase = await createClient();
  const { data: departments } = await supabase.from("departments").select("id, name").is("deleted_at", null).order("name");

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Invite Faculty</h1>
        <p className="text-sm text-muted-foreground">Creates a Faculty account requiring email verification before first login.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Faculty details</CardTitle>
          <CardDescription>Email must follow firstname.lastname@tcetmumbai.in. Subject and class assignments are added afterward on the Faculty&apos;s profile page.</CardDescription>
        </CardHeader>
        <CardContent><InviteFacultyForm departments={departments ?? []} /></CardContent>
      </Card>
    </div>
  );
}
