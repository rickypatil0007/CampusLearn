import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Account suspended" };

export default function SuspendedPage() {
  return (
    <Card>
      <CardHeader className="items-center text-center">
        <ShieldAlert className="mb-2 h-10 w-10 text-error" />
        <CardTitle className="text-foreground text-xl normal-case">Account suspended</CardTitle>
        <CardDescription>
          Your CampusLearn account has been suspended. Contact your Department Administrator for assistance.
        </CardDescription>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
