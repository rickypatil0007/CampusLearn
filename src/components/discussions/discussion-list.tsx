import Link from "next/link";
import { Users, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate } from "@/lib/utils";

export async function DiscussionList({ subjectId }: { subjectId?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("discussions")
    .select("id, title, body, created_at, profiles:created_by(full_name), subjects:subject_id(code), discussion_replies(id, is_accepted)")
    .order("created_at", { ascending: false })
    .limit(50);
  if (subjectId) query = query.eq("subject_id", subjectId);
  const { data: discussions } = await query;

  if (!discussions || discussions.length === 0) {
    return <EmptyState icon={MessageCircle} title="No discussions yet" description="Ask the first question for this subject." />;
  }

  return (
    <div className="space-y-3">
      {discussions.map((d) => {
        const replies = (d.discussion_replies as unknown as { id: string; is_accepted: boolean }[]) ?? [];
        const hasAccepted = replies.some((r) => r.is_accepted);
        return (
          <Link key={d.id} href={`/discussions/${d.id}`}>
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="p-4">
                <p className="font-medium text-foreground">{d.title}</p>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{d.body}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                  {!subjectId && <span>{(d.subjects as unknown as { code: string } | null)?.code}</span>}
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(d.profiles as unknown as { full_name: string } | null)?.full_name}</span>
                  <span>{formatDate(d.created_at)}</span>
                  <span>{replies.length} repl{replies.length === 1 ? "y" : "ies"}</span>
                  {hasAccepted && <span className="text-primary">✓ Answered</span>}
                </div>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
