"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { approveAnnouncementAction } from "./_actions";

export function AnnouncementApprovalButtons({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  function act(approve: boolean) {
    startTransition(async () => {
      const result = await approveAnnouncementAction(id, approve);
      if (!result.ok) { toast.error(result.error); return; }
      router.refresh();
    });
  }
  return (
    <div className="mt-2 flex gap-2">
      <Button size="sm" disabled={isPending} onClick={() => act(true)}>Approve</Button>
      <Button size="sm" variant="destructive" disabled={isPending} onClick={() => act(false)}>Reject</Button>
    </div>
  );
}
