import { notFound } from "next/navigation";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { ReplyForm } from "./reply-form";
import { ReplyActions } from "./reply-actions";

export default async function DiscussionDetailPage({ params }: { params: Promise<{ discussionId: string }> }) {
  const { discussionId } = await params;
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: discussion } = await supabase
    .from("discussions")
    .select("id, title, body, created_at, subject_id, profiles:created_by(full_name), subjects:subject_id(name)")
    .eq("id", discussionId)
    .maybeSingle();
  if (!discussion) notFound();

  const { data: replies } = await supabase
    .from("discussion_replies")
    .select("id, body, created_at, is_faculty_verified, is_accepted, created_by, profiles:created_by(full_name), discussion_votes(id, user_id)")
    .eq("discussion_id", discussionId)
    .order("created_at");

  const isFacultyOrAdmin = ["faculty", "dept_admin", "super_admin"].includes(user.role);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <p className="text-xs text-muted-foreground">{(discussion.subjects as unknown as { name: string } | null)?.name}</p>
        <h1 className="text-xl font-semibold text-foreground">{discussion.title}</h1>
        <p className="mt-2 text-sm text-foreground">{discussion.body}</p>
        <p className="mt-2 text-xs text-muted-foreground">
          {(discussion.profiles as unknown as { full_name: string } | null)?.full_name} · {formatDateTime(discussion.created_at)}
        </p>
      </div>

      <div className="space-y-3">
        {(replies ?? []).map((r) => {
          const votes = (r.discussion_votes as unknown as { id: string; user_id: string }[]) ?? [];
          return (
            <Card key={r.id} className={r.is_accepted ? "border-primary/50" : undefined}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{(r.profiles as unknown as { full_name: string } | null)?.full_name}</span>
                    {r.is_faculty_verified && <Badge variant="success">Faculty</Badge>}
                    {r.is_accepted && <Badge variant="outline">Accepted answer</Badge>}
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                </div>
                <p className="mt-2 text-sm text-foreground">{r.body}</p>
                <ReplyActions replyId={r.id} discussionId={discussionId} voteCount={votes.length} hasVoted={votes.some((v) => v.user_id === user.id)} isOwn={r.created_by === user.id} canModerate={isFacultyOrAdmin} />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ReplyForm discussionId={discussionId} />
    </div>
  );
}
