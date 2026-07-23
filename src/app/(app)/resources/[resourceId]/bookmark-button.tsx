"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toggleBookmarkAction } from "../_actions";

export function BookmarkButton({ resourceId, initialBookmarked }: { resourceId: string; initialBookmarked: boolean }) {
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const result = await toggleBookmarkAction(resourceId);
          if (!result.ok) { toast.error(result.error); return; }
          setBookmarked(result.data.bookmarked);
        })
      }
    >
      {bookmarked ? <BookmarkCheck className="h-4 w-4 text-primary" /> : <Bookmark className="h-4 w-4" />}
      {bookmarked ? "Bookmarked" : "Bookmark"}
    </Button>
  );
}
