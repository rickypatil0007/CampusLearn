"use client";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validation/auth";
import { forgotPasswordAction } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: "" } });

  if (sent) {
    return (
      <Alert variant="success">
        <AlertDescription>If an account exists for that email, a reset link is on its way.</AlertDescription>
      </Alert>
    );
  }

  return (
    <Form {...form}>
      <form
        className="space-y-4"
        noValidate
        onSubmit={form.handleSubmit((values) =>
          startTransition(async () => {
            const result = await forgotPasswordAction(values);
            if (!result.ok) {
              toast.error(result.error);
              return;
            }
            setSent(true);
          })
        )}
      >
        <FormField control={form.control} name="email" render={({ field }) => (
          <FormItem>
            <FormLabel>Institutional email</FormLabel>
            <FormControl><Input type="email" placeholder="you@tcetmumbai.in" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
    </Form>
  );
}
