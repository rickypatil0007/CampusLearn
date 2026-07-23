"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { deleteSubjectAction } from "../_actions/academic";

export function DeleteSubjectButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="ghost" size="icon" aria-label={`Delete ${name}`}><Trash2 className="h-4 w-4 text-error" /></Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Delete {name}?</DialogTitle><DialogDescription>This soft-deletes the subject.</DialogDescription></DialogHeader>
        <DialogFooter>
          <Button variant="destructive" disabled={isPending} onClick={() =>
            startTransition(async () => {
              const result = await deleteSubjectAction(id);
              if (!result.ok) { toast.error(result.error); return; }
              toast.success("Subject deleted.");
              router.refresh();
            })
          }>{isPending ? "Deleting…" : "Delete"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
