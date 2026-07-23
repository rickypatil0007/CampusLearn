"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { institutionSettingsSchema, type InstitutionSettingsInput } from "@/lib/validation/settings";
import { updateInstitutionSettingsAction } from "../_actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription, FormMessage } from "@/components/ui/form";

export function SettingsForm({ initial }: { initial: InstitutionSettingsInput }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<InstitutionSettingsInput>({ resolver: zodResolver(institutionSettingsSchema), defaultValues: initial });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const result = await updateInstitutionSettingsAction(values);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Settings updated.");
          router.refresh();
        })
      )}>
        <FormField control={form.control} name="aiFeaturesEnabled" render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-md border border-border p-3">
            <div>
              <FormLabel>AI features enabled</FormLabel>
              <FormDescription>Turn off to disable the AI assistant, summarizer, and quiz generator institution-wide.</FormDescription>
            </div>
            <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
          </FormItem>
        )} />
        <FormField control={form.control} name="maxUploadSizeMb" render={({ field }) => (
          <FormItem><FormLabel>Max upload size (MB)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="aiRequestsPerUserPerDay" render={({ field }) => (
          <FormItem><FormLabel>AI requests per user per day</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save settings"}</Button>
      </form>
    </Form>
  );
}
