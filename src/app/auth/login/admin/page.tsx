import type { Metadata } from "next";
import { LoginForm } from "../login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Admin Log in" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Admin Log in</CardTitle>
        <CardDescription>Access your CampusLearn admin account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={next} portal="admin" />
      </CardContent>
    </Card>
  );
}
