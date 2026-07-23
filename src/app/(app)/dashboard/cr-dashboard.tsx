import Link from "next/link";
import { Upload, Clock, CheckCircle2, XCircle, Megaphone, Bell, LayoutGrid } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MetricCard, EmptyState } from "@/components/dashboard/metric-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";

export async function CrDashboard({ userId }: { userId: string }) {
  const supabase = await createClient();

  const [{ data: myUploads }, { data: classAssignment }, { data: recentAnnouncements }, { count: quizNotifications }] = await Promise.all([
    supabase.from("resources").select("id, title, approval_status, created_at").eq("uploaded_by", userId).order("created_at", { ascending: false }),
    supabase
      .from("class_representative_assignments")
      .select("department_id, division_id, semester_id, departments:department_id(name), divisions:division_id(name), semesters:semester_id(name)")
      .eq("student_id", userId)
      .eq("is_active", true)
      .maybeSingle(),
    supabase.from("announcements").select("id, title, created_at").eq("created_by", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("type", "quiz_published").eq("is_read", false),
  ]);

  const pending = myUploads?.filter((r) => r.approval_status === "pending").length ?? 0;
  const approved = myUploads?.filter((r) => r.approval_status === "approved").length ?? 0;
  const rejected = myUploads?.filter((r) => r.approval_status === "rejected").length ?? 0;

  const dept = (classAssignment?.departments as unknown as { name: string } | null)?.name;
  const div = (classAssignment?.divisions as unknown as { name: string } | null)?.name;
  const sem = (classAssignment?.semesters as unknown as { name: string } | null)?.name;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Class Representative Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {classAssignment ? (
              <span className="inline-flex items-center gap-1"><LayoutGrid className="h-3.5 w-3.5" /> {dept} · {sem} · Division {div}</span>
            ) : "No active class assignment."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="outline"><Link href="/announcements"><Megaphone className="h-4 w-4" /> New announcement</Link></Button>
          <Button asChild size="sm"><Link href="/faculty/resources/new"><Upload className="h-4 w-4" /> Upload resource</Link></Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard label="Pending" value={pending} icon={Clock} />
        <MetricCard label="Approved" value={approved} icon={CheckCircle2} accent />
        <MetricCard label="Rejected" value={rejected} icon={XCircle} />
        <MetricCard label="Quiz Notifications" value={quizNotifications ?? 0} icon={Bell} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Your Submissions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {myUploads && myUploads.length > 0 ? myUploads.slice(0, 6).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <Link href={`/resources/${r.id}`} className="text-foreground hover:underline">{r.title}</Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant={r.approval_status === "approved" ? "success" : r.approval_status === "pending" ? "warning" : "destructive"}>{r.approval_status.replace("_", " ")}</Badge>
                  {formatDate(r.created_at)}
                </div>
              </div>
            )) : <EmptyState title="No submissions yet" description="Upload your first resource for your class." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Your Announcements</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {recentAnnouncements && recentAnnouncements.length > 0 ? recentAnnouncements.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{a.title}</span>
                <span className="text-xs text-muted-foreground">{formatDate(a.created_at)}</span>
              </div>
            )) : <EmptyState title="No announcements yet" description="Publish an update for your class." />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
