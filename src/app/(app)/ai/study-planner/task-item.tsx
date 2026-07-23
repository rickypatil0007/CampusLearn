"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toggleTaskCompleteAction } from "./_actions";

export function TaskItem({ task }: { task: { id: string; title: string; duration_minutes: number; is_complete: boolean; task_type: string } }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox
        checked={task.is_complete}
        disabled={isPending}
        onCheckedChange={() => startTransition(async () => { await toggleTaskCompleteAction(task.id); router.refresh(); })}
      />
      <span className={cn(task.is_complete ? "text-muted-foreground line-through" : "text-foreground")}>{task.title}</span>
      <span className="text-xs text-muted-foreground">({task.duration_minutes}m)</span>
    </label>
  );
}
