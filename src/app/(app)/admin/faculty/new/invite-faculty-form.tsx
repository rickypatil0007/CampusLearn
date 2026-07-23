"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { inviteFacultySchema, type InviteFacultyInput } from "@/lib/validation/faculty";
import { inviteFacultyAction } from "../_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";

export function InviteFacultyForm({ departments }: { departments: { id: string; name: string }[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [created, setCreated] = useState<{ email: string; temporaryPassword: string } | null>(null);
  const form = useForm<InviteFacultyInput>({ resolver: zodResolver(inviteFacultySchema), defaultValues: { email: "", fullName: "", departmentId: "" } });

  if (created) {
    return (
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="space-y-3 p-4 text-sm">
          <p className="font-medium text-foreground">Faculty account created.</p>
          <p className="text-muted-foreground">Share this temporary password with {created.email} through a secure channel. They must verify their email and should change this password after first login. This will not be shown again.</p>
          <p className="font-mono-label rounded bg-elevated p-2 text-primary">{created.temporaryPassword}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => router.push("/admin/faculty")}>Done</Button>
            <Button size="sm" variant="outline" onClick={() => { setCreated(null); form.reset(); }}>Invite another</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await inviteFacultyAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Faculty account created.");
          setCreated(result.data);
        })
      )}>
        <FormField control={form.control} name="fullName" render={({ field }) => (
          <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem><FormLabel>Institutional email</FormLabel><FormControl><Input type="email" placeholder="firstname.lastname@tcetmumbai.in" {...field} /></FormControl><FormMessage /></FormItem>
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
        <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create Faculty account"}</Button>
      </form>
    </Form>
  );
}
