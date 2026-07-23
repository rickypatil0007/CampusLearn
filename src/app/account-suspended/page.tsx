import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account Suspended" };

export default function AccountSuspendedPage() {
  return (
    <div className="flex h-screen w-full items-center justify-center p-4">
      <Card className="max-w-md w-full border-destructive/50">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 bg-destructive/10 p-3 rounded-full w-fit">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>
          <CardTitle className="text-xl">Account Suspended</CardTitle>
          <CardDescription>
            Your access to CampusLearn has been temporarily suspended.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-sm text-muted-foreground">
            If you believe this is a mistake, please contact your department administrator or the institution administration for assistance.
          </p>
          <Button asChild className="w-full">
            <Link href="/auth/login">Return to Login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
