import { requirePermission } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SuspensionsTable } from "./suspensions-table";
import { SuspensionsSearch } from "./suspensions-search";

export default async function SuspensionsPage({ searchParams }: { searchParams: Promise<{ query?: string }> }) {
  await requirePermission("user.suspend");
  const { query } = await searchParams;
  const supabase = await createClient();

  let dbQuery = supabase
    .from("profiles")
    .select("id, full_name, email, role, is_suspended, student_id")
    .order("full_name");

  if (query) {
    dbQuery = dbQuery.or(`full_name.ilike.%${query}%,email.ilike.%${query}%,student_id.ilike.%${query}%`);
  } else {
    // If no query, only show suspended users by default, or limit to a few. Let's show all suspended users if no search.
    dbQuery = dbQuery.eq("is_suspended", true);
  }

  const { data: users } = await dbQuery.limit(50);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">User Suspensions</h1>
        <p className="text-sm text-muted-foreground">Manage account access and suspensions.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Users</CardTitle>
          <CardDescription>Search by name, email, or Student ID to find users to suspend or unsuspend.</CardDescription>
        </CardHeader>
        <CardContent>
          <SuspensionsSearch defaultQuery={query ?? ""} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{query ? "Search Results" : "Currently Suspended Users"}</CardTitle>
        </CardHeader>
        <CardContent>
          <SuspensionsTable users={users ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
