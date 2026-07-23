"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { suspendUserAction } from "../../_actions/academic";

export function FacultyStatusButton({ facultyId, isSuspended }: { facultyId: string; isSuspended: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  if (isSuspended) {
    return (
      <Button
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => startTransition(async () => {
          const result = await suspendUserAction(facultyId, false);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Faculty account reactivated.");
          router.refresh();
        })}
      >
        Reactivate
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="destructive">Deactivate</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deactivate this Faculty account?</DialogTitle>
          <DialogDescription>
            This revokes login immediately. Their teaching history, uploaded resources, and quizzes are preserved. This is a soft action — reactivate at any time.
          </DialogDescription>
        </DialogHeader>
        <Textarea placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => startTransition(async () => {
              const result = await suspendUserAction(facultyId, true, reason || "Deactivated by administrator");
              if (!result.ok) { toast.error(result.error); return; }
              toast.success("Faculty account deactivated.");
              setOpen(false);
              router.refresh();
            })}
          >
            {isPending ? "Deactivating…" : "Deactivate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
