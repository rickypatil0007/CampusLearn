"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitAssignmentAction } from "../_actions";

export function SubmitAssignmentForm({ assignmentId, allowMultipleFiles }: { assignmentId: string; allowMultipleFiles: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [fileCount, setFileCount] = useState(0);

  return (
    <form
      ref={formRef}
      className="space-y-3"
      action={(formData) =>
        startTransition(async () => {
          formData.set("assignmentId", assignmentId);
          const result = await submitAssignmentAction(formData);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Submission received.");
          formRef.current?.reset();
          setFileCount(0);
          router.refresh();
        })
      }
    >
      <Input type="file" name="files" multiple={allowMultipleFiles} onChange={(e) => setFileCount(e.target.files?.length ?? 0)} accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png" />
      <Button type="submit" disabled={isPending || fileCount === 0}>{isPending ? "Submitting…" : "Submit assignment"}</Button>
    </form>
  );
}
