"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { reviewResourceAction } from "../../resources/_actions";

export function ApprovalActions({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  function review(status: "approved" | "rejected" | "changes_requested", withComment = false) {
    startTransition(async () => {
      const result = await reviewResourceAction({ resourceId, status, comment: withComment ? comment : undefined });
      if (!result.ok) { toast.error(result.error); return; }
      toast.success(`Resource ${status.replace("_", " ")}.`);
      setDialogOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => review("approved")}><Check className="h-4 w-4" /> Approve</Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => review("rejected")}><X className="h-4 w-4" /> Reject</Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild><Button size="sm" variant="outline"><MessageSquare className="h-4 w-4" /> Request changes</Button></DialogTrigger>
        <DialogContent>
          <DialogHeader><DialogTitle>Request changes</DialogTitle></DialogHeader>
          <Textarea placeholder="What needs to change?" value={comment} onChange={(e) => setComment(e.target.value)} />
          <DialogFooter><Button disabled={isPending || !comment.trim()} onClick={() => review("changes_requested", true)}>Send</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
