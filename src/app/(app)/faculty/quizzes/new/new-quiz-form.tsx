"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { quizSchema, type QuizInput } from "@/lib/validation/quizzes";
import { createQuizAction } from "../../../quizzes/_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function NewQuizForm({ subjects }: { subjects: { id: string; name: string; code: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<QuizInput>({
    resolver: zodResolver(quizSchema),
    defaultValues: { title: "", description: "", subjectId: "", instructions: "", maxAttempts: 1 },
  });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createQuizAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Quiz created. Add questions below.");
          router.push(`/faculty/quizzes/${result.data.quizId}`);
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
        <FormField control={form.control} name="description" render={({ field }) => (
          <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="instructions" render={({ field }) => (
          <FormItem><FormLabel>Instructions</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-3 gap-4">
          <FormField control={form.control} name="timeLimitMinutes" render={({ field }) => (
            <FormItem><FormLabel>Time limit (min)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="maxAttempts" render={({ field }) => (
            <FormItem><FormLabel>Max attempts</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="passingMarks" render={({ field }) => (
            <FormItem><FormLabel>Passing marks</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="dueAt" render={({ field }) => (
          <FormItem><FormLabel>Due date</FormLabel><FormControl><Input type="datetime-local" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create draft"}</Button>
      </form>
    </Form>
  );
}
