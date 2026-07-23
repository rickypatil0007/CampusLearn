import type { Metadata } from "next";
import { CheckSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate } from "@/lib/utils";
import { ApprovalActions } from "./approval-actions";

export const metadata: Metadata = { title: "Approvals" };

export default async function ApprovalsPage() {
  const supabase = await createClient();
  const { data: pending } = await supabase
    .from("resources")
    .select("id, title, description, resource_type, created_at, profiles:uploaded_by(full_name), subjects:subject_id(name, code)")
    .eq("approval_status", "pending")
    .order("created_at");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Approvals</h1>
        <p className="text-sm text-muted-foreground">Review Class Representative resource submissions.</p>
      </div>

      {pending && pending.length > 0 ? (
        <div className="space-y-3">
          {pending.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{r.title}</p>
                    <Badge variant="muted">{(r.subjects as unknown as { code: string } | null)?.code}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Submitted by {(r.profiles as unknown as { full_name: string } | null)?.full_name} on {formatDate(r.created_at)}
                  </p>
                </div>
                <ApprovalActions resourceId={r.id} />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={CheckSquare} title="Nothing pending" description="All submitted resources have been reviewed." />
      )}
    </div>
  );
}
