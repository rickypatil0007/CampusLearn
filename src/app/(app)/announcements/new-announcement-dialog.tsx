"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { announcementSchema, crAnnouncementSchema, type AnnouncementInput, type CrAnnouncementInput } from "@/lib/validation/announcements";
import { createAnnouncementAction } from "./_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

/** Faculty/Admin: choose any target scope, publishes immediately. */
function FacultyAdminForm({ departments, onDone }: { departments: { id: string; name: string }[]; onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<AnnouncementInput>({ resolver: zodResolver(announcementSchema), defaultValues: { title: "", message: "", priority: "normal", targetDepartmentId: "" } });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createAnnouncementAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Announcement published.");
          onDone(); form.reset(); router.refresh();
        })
      )}>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="message" render={({ field }) => (
          <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem><FormLabel>Priority</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="targetDepartmentId" render={({ field }) => (
          <FormItem><FormLabel>Target department (optional)</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="All departments" /></SelectTrigger></FormControl>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Publishing…" : "Publish"}</Button></DialogFooter>
      </form>
    </Form>
  );
}

/** Class Representative: no target picker at all -- always their own class,
 * derived server-side. Publishes immediately, no approval step. */
function CrForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<CrAnnouncementInput>({ resolver: zodResolver(crAnnouncementSchema), defaultValues: { title: "", message: "", priority: "normal" } });

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await createAnnouncementAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Announcement published to your class.");
          onDone(); form.reset(); router.refresh();
        })
      )}>
        <FormField control={form.control} name="title" render={({ field }) => (
          <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="message" render={({ field }) => (
          <FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="priority" render={({ field }) => (
          <FormItem><FormLabel>Priority</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent><SelectItem value="normal">Normal</SelectItem><SelectItem value="important">Important</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <DialogFooter><Button type="submit" disabled={isPending}>{isPending ? "Publishing…" : "Publish to my class"}</Button></DialogFooter>
      </form>
    </Form>
  );
}

export function NewAnnouncementDialog({ departments, isCr }: { departments: { id: string; name: string }[]; isCr: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4" /> New announcement</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New announcement</DialogTitle>
          <DialogDescription>
            {isCr ? "Publishes immediately to students in your assigned class. No approval needed." : "Publishes immediately to the audience you choose."}
          </DialogDescription>
        </DialogHeader>
        {isCr ? <CrForm onDone={close} /> : <FacultyAdminForm departments={departments} onDone={close} />}
      </DialogContent>
    </Dialog>
  );
}
