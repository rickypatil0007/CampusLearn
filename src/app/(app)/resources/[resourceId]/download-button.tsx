"use client";
import { useTransition } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getResourceDownloadUrlAction } from "../_actions";

export function DownloadButton({ resourceId }: { resourceId: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await getResourceDownloadUrlAction(resourceId);
          if (!result.ok) { toast.error(result.error); return; }
          window.open(result.data.url, "_blank", "noopener,noreferrer");
        })
      }
    >
      <Download className="h-4 w-4" /> {isPending ? "Preparing…" : "Download"}
    </Button>
  );
}
