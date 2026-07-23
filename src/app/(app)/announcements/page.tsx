import type { Metadata } from "next";
import { Megaphone } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate, cn } from "@/lib/utils";
import { NewAnnouncementDialog } from "./new-announcement-dialog";
import { AnnouncementApprovalButtons } from "./approval-buttons";

export const metadata: Metadata = { title: "Announcements" };

const PRIORITY_VARIANT: Record<string, "outline" | "warning" | "destructive"> = { normal: "outline", important: "warning", urgent: "destructive" };

export default async function AnnouncementsPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();
  const isFacultyOrAdmin = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  const canPost = isFacultyOrAdmin || user.role === "class_rep";

  const query = isFacultyOrAdmin
    ? supabase.from("announcements").select("id, title, message, priority, approval_status, publish_at, created_by, profiles:created_by(full_name)").order("publish_at", { ascending: false })
    : supabase.from("announcements").select("id, title, message, priority, approval_status, publish_at, created_by, profiles:created_by(full_name)").eq("approval_status", "approved").order("publish_at", { ascending: false });

  const { data: announcements } = await query;
  const [{ data: departments }] = await Promise.all([supabase.from("departments").select("id, name").is("deleted_at", null)]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Announcements</h1>
          <p className="text-sm text-muted-foreground">Institution and subject updates.</p>
        </div>
        {canPost && <NewAnnouncementDialog departments={departments ?? []} isCr={user.role === "class_rep"} />}
      </div>

      {announcements && announcements.length > 0 ? (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={cn(a.priority === "urgent" && "border-error/40")}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{a.title}</p>
                  <Badge variant={PRIORITY_VARIANT[a.priority]}>{a.priority}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{a.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {(a.profiles as unknown as { full_name: string } | null)?.full_name} · {formatDate(a.publish_at)}
                  {a.approval_status === "pending" && " · pending approval"}
                </p>
                {isFacultyOrAdmin && a.approval_status === "pending" && <AnnouncementApprovalButtons id={a.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Megaphone} title="No announcements yet" />
      )}
    </div>
  );
}
