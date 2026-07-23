"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { markAllNotificationsReadAction } from "./_actions";

export function NotificationActions() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline" size="sm" disabled={isPending}
      onClick={() => startTransition(async () => {
        const result = await markAllNotificationsReadAction();
        if (!result.ok) { toast.error(result.error); return; }
        router.refresh();
      })}
    >
      {isPending ? "Marking…" : "Mark all as read"}
    </Button>
  );
}
