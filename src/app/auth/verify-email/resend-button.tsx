"use client";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { resendVerificationAction } from "../actions";

export function ResendVerificationButton({ email }: { email: string }) {
  const [isPending, startTransition] = useTransition();
  const [nextAllowedAt, setNextAllowedAt] = useState<number | null>(null);
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!nextAllowedAt) return;
    const tick = () => setRemaining(Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000)));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [nextAllowedAt]);

  const isCoolingDown = remaining > 0;

  return (
    <Button
      variant="outline"
      disabled={isPending || isCoolingDown}
      onClick={() =>
        startTransition(async () => {
          const result = await resendVerificationAction(email);
          if (result.ok) {
            setNextAllowedAt(new Date(result.data.nextAllowedAt).getTime());
            toast.success("If this account exists and isn't verified yet, a new verification email is on its way.");
          } else {
            toast.error(result.error);
          }
        })
      }
    >
      {isCoolingDown ? `Resend available in ${remaining}s` : isPending ? "Sending…" : "Resend verification email"}
    </Button>
  );
}
