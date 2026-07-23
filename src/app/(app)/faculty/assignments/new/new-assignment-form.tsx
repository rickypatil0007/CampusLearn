"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { assignmentSchema, type AssignmentInput } from "@/lib/validation/assignments";
import { createAssignmentAction } from "../../../assignments/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function NewAssignmentForm({ subjects }: { subjects: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<AssignmentInput>({
    resolver: zodResolver(assignmentSchema),
    defaultValues: { title: "", instructions: "", subjectId: "", maxMarks: 100, dueAt: "", allowMultipleFiles: true, allowResubmission: false, lateSubmissionAllowed: false },
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createAssignmentAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Assignment created.");
          router.push(`/assignments/${result.data.assignmentId}`);
        })
      )}>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="subjectId" render={({ field }) => (
          <FormItem><FormLabel>Subject</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger></FormControl>
              <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="instructions" render={({ field }) => (
          <FormItem><FormLabel>Instructions</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="maxMarks" render={({ field }) => (
            <FormItem><FormLabel>Max marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="dueAt" render={({ field }) => (
            <FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="allowMultipleFiles" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
            <FormLabel>Allow multiple files</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="allowResubmission" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
            <FormLabel>Allow resubmission</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="lateSubmissionAllowed" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
            <FormLabel>Allow late submission</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create assignment"}</Button>
      </form>
    </Form>
  );
}
