"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { inviteStaffSchema, type InviteStaffInput } from "@/lib/validation/settings";
import { inviteStaffAction } from "../_actions/academic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function InviteStaffForm({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<InviteStaffInput>({ resolver: zodResolver(inviteStaffSchema), defaultValues: { email: "", fullName: "", role: "faculty", departmentId: "" } });

  return (
    <Form {...form}>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await inviteStaffAction(values.email, values.fullName, values.role, values.departmentId);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Staff account created.");
          form.reset();
          router.refresh();
        })
      )}>
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Institutional email</FormLabel><FormControl><Input type="email" placeholder="faculty@tcetmumbai.in" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="role" render={({ field }) => (
          <FormItem><FormLabel>Role</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
              <SelectContent><SelectItem value="faculty">Faculty</SelectItem><SelectItem value="dept_admin">Department Administrator</SelectItem></SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <FormField control={form.control} name="departmentId" render={({ field }) => (
          <FormItem><FormLabel>Department</FormLabel>
            <Select onValueChange={field.onChange} value={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
              <SelectContent>{departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )} />
        <div className="sm:col-span-2">
          <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create account"}</Button>
        </div>
      </form>
    </Form>
  );
}
