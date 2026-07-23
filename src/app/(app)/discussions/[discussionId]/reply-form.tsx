"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { replyToDiscussionAction } from "../_actions";

export function ReplyForm({ discussionId }: { discussionId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();
  return (
    <div className="space-y-2">
      <Textarea placeholder="Write a reply…" value={body} onChange={(e) => setBody(e.target.value)} />
      <Button
        disabled={isPending || !body.trim()}
        onClick={() => startTransition(async () => {
          const result = await replyToDiscussionAction({ discussionId, body });
          if (!result.ok) { toast.error(result.error); return; }
          setBody("");
          router.refresh();
        })}
      >
        {isPending ? "Posting…" : "Post reply"}
      </Button>
    </div>
  );
}
