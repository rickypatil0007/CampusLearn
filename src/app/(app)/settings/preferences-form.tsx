"use client";
import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { notificationPreferencesSchema, type NotificationPreferencesInput } from "@/lib/validation/profile";
import { updateNotificationPreferencesAction } from "./_actions";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";

const FIELDS: { name: keyof NotificationPreferencesInput; label: string }[] = [
  { name: "emailEnabled", label: "Email notifications" },
  { name: "resourceUpdates", label: "New resources" },
  { name: "quizUpdates", label: "Quiz publish & deadlines" },
  { name: "assignmentUpdates", label: "Assignment publish, deadlines & grading" },
  { name: "announcementUpdates", label: "Announcements" },
  { name: "discussionUpdates", label: "Discussion replies" },
];

export function PreferencesForm({ initial }: { initial: NotificationPreferencesInput }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<NotificationPreferencesInput>({ resolver: zodResolver(notificationPreferencesSchema), defaultValues: initial });

  return (
    <Form {...form}>
      <form className="space-y-3" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await updateNotificationPreferencesAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Preferences saved.");
        })
      )}>
        {FIELDS.map((f) => (
          <FormField key={f.name} control={form.control} name={f.name} render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
              <FormLabel className="font-normal">{f.label}</FormLabel>
              <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
            </FormItem>
          )} />
        ))}
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save preferences"}</Button>
      </form>
    </Form>
  );
}
