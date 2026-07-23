import type { Metadata } from "next";
import Link from "next/link";
import { Shield } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ROLES, ROLE_LABELS } from "@/lib/permissions/roles";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Roles" };

export default async function RolesPage() {
  const supabase = await createClient();
  const counts = await Promise.all(
    ROLES.map((role) => supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", role))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Roles</h1>
          <p className="text-sm text-muted-foreground">Institution-wide role distribution. Role changes are made from the Users page.</p>
        </div>
        <Button asChild variant="outline"><Link href="/admin/users">Manage users</Link></Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((role, i) => (
          <Card key={role}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Shield className="h-4 w-4 text-primary" /> {ROLE_LABELS[role]}</CardTitle>
                <Badge variant="outline">{counts[i].count ?? 0}</Badge>
              </div>
              <CardDescription>
                {role === "student" && "Default role for all self-registered accounts."}
                {role === "class_rep" && "Assigned by Faculty or Administrators."}
                {role === "faculty" && "Created or invited by Administrators."}
                {role === "dept_admin" && "Manages a single department."}
                {role === "super_admin" && "Full institutional access."}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
