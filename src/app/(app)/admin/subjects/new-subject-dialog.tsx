"use client";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { subjectSchema, type SubjectInput } from "@/lib/validation/academic";
import { createSubjectAction } from "../_actions/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface SemesterOption { id: string; name: string; number: number; programmes: { name: string; department_id: string } | null }

export function NewSubjectDialog({ departments, semesters }: { departments: { id: string; name: string }[]; semesters: SemesterOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<SubjectInput>({
    resolver: zodResolver(subjectSchema),
    defaultValues: { name: "", code: "", description: "", credits: 3, departmentId: "", semesterId: "" },
  });

  const departmentId = form.watch("departmentId");
  const filteredSemesters = useMemo(
    () => semesters.filter((s) => !departmentId || s.programmes?.department_id === departmentId),
    [semesters, departmentId]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New subject</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New subject</DialogTitle></DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              const result = await createSubjectAction(values);
              if (!result.ok) { toast.error(result.error); return; }
              toast.success("Subject created.");
              setOpen(false); form.reset(); router.refresh();
            })
          )}>
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="Data Structures" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="CE301" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="credits" render={({ field }) => (
                <FormItem><FormLabel>Credits</FormLabel><FormControl><Input type="number" min={1} max={10} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="departmentId" render={({ field }) => (
              <FormItem><FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="semesterId" render={({ field }) => (
              <FormItem><FormLabel>Semester</FormLabel>
                <Select onValueChange={field.onChange} value={field.value} disabled={!departmentId}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select semester" /></SelectTrigger></FormControl>
                  <SelectContent>
                    {filteredSemesters.map((s) => <SelectItem key={s.id} value={s.id}>{s.programmes?.name} — Sem {s.number}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create subject"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
