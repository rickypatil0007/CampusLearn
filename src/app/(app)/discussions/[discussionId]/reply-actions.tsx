"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ThumbsUp, Check, Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { upvoteReplyAction, acceptReplyAction, reportContentAction } from "../_actions";

export function ReplyActions({
  replyId, discussionId, voteCount, hasVoted, isOwn, canModerate,
}: { replyId: string; discussionId: string; voteCount: number; hasVoted: boolean; isOwn: boolean; canModerate: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="mt-2 flex items-center gap-2">
      <Button
        variant={hasVoted ? "secondary" : "ghost"} size="sm" disabled={isPending}
        onClick={() => startTransition(async () => { await upvoteReplyAction(replyId); router.refresh(); })}
      >
        <ThumbsUp className="h-3 w-3" /> {voteCount}
      </Button>
      {canModerate && (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => startTransition(async () => {
          const result = await acceptReplyAction(replyId, discussionId);
          if (!result.ok) toast.error(result.error);
          router.refresh();
        })}>
          <Check className="h-3 w-3" /> Accept
        </Button>
      )}
      {!isOwn && (
        <Button variant="ghost" size="sm" disabled={isPending} onClick={() => startTransition(async () => { await reportContentAction(replyId, discussionId); toast.success("Reported."); })}>
          <Flag className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
