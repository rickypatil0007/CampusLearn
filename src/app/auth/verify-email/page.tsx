import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ResendVerificationButton } from "./resend-button";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <MailCheck className="mb-2 h-10 w-10 text-primary" />
        <CardTitle className="text-foreground text-xl normal-case">Verify your email</CardTitle>
        <CardDescription>
          {email ? (
            <>We sent a verification link to <strong className="text-foreground">{email}</strong>.</>
          ) : (
            "Check your inbox for a verification link."
          )}
          {" "}Your account stays inactive until you verify.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-3">
        {email && <ResendVerificationButton email={email} />}
        <Link href="/auth/login" className="text-sm text-primary hover:underline">
          Back to log in
        </Link>
      </CardContent>
    </Card>
  );
}
