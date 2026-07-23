"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { programmeSchema, type ProgrammeInput } from "@/lib/validation/academic";
import { createProgrammeAction } from "../_actions/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function NewProgrammeDialog({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const form = useForm<ProgrammeInput>({ resolver: zodResolver(programmeSchema), defaultValues: { name: "", code: "", departmentId: "", durationYears: 4 } });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New programme</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New programme</DialogTitle></DialogHeader>
        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
            startTransition(async () => {
              const result = await createProgrammeAction(values);
              if (!result.ok) { toast.error(result.error); return; }
              toast.success("Programme created.");
              setOpen(false); form.reset(); router.refresh();
            })
          )}>
            <FormField control={form.control} name="departmentId" render={({ field }) => (
              <FormItem><FormLabel>Department</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                  <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Name</FormLabel><FormControl><Input placeholder="B.E. Computer Engineering" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="code" render={({ field }) => (
              <FormItem><FormLabel>Code</FormLabel><FormControl><Input placeholder="BE-CE" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="durationYears" render={({ field }) => (
              <FormItem><FormLabel>Duration (years)</FormLabel><FormControl><Input type="number" min={1} max={6} {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create programme"}</Button></DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
