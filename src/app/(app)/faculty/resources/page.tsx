import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My Resources" };

export default async function FacultyResourcesPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: resources } = await supabase
    .from("resources")
    .select("id, title, resource_type, approval_status, view_count, download_count, created_at, subjects:subject_id(code)")
    .eq("uploaded_by", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">My Resources</h1>
          <p className="text-sm text-muted-foreground">Resources you&apos;ve uploaded across your subjects.</p>
        </div>
        <Link href="/faculty/resources/new"><Button size="sm"><Plus className="h-4 w-4" /> Upload resource</Button></Link>
      </div>
      {resources && resources.length > 0 ? (
        <Table>
          <TableHeader><TableRow><TableHead>Title</TableHead><TableHead>Subject</TableHead><TableHead>Status</TableHead><TableHead>Views</TableHead><TableHead>Downloads</TableHead><TableHead>Uploaded</TableHead></TableRow></TableHeader>
          <TableBody>
            {resources.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Link href={`/resources/${r.id}`} className="text-foreground hover:underline">{r.title}</Link></TableCell>
                <TableCell className="text-muted-foreground">{(r.subjects as unknown as { code: string } | null)?.code}</TableCell>
                <TableCell><Badge variant={r.approval_status === "approved" ? "success" : r.approval_status === "pending" ? "warning" : "destructive"}>{r.approval_status.replace("_", " ")}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{r.view_count}</TableCell>
                <TableCell className="text-muted-foreground">{r.download_count}</TableCell>
                <TableCell className="text-muted-foreground">{formatDate(r.created_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState icon={FileText} title="No resources yet" description="Upload lecture notes, slides, or reference material for your subjects." />
      )}
    </div>
  );
}
