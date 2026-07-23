"use client";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validation/profile";
import { updateProfileAction } from "./_actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function ProfileForm({ initialName, email }: { initialName: string; email: string }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateProfileInput>({ resolver: zodResolver(updateProfileSchema), defaultValues: { fullName: initialName } });

  return (
    <div className="space-y-4">
      <div><Label>Email</Label><Input value={email} disabled /></div>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            const result = await updateProfileAction(values);
            if (!result.ok) { toast.error(result.error); return; }
            toast.success("Profile updated.");
          })
        )}>
          <FormField control={form.control} name="fullName" render={({ field }) => (
            <FormItem><FormLabel>Full name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</Button>
        </form>
      </Form>
    </div>
  );
}
