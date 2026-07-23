import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Student Log in" };

export default async function StudentLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Student Log in</CardTitle>
        <CardDescription>Access your CampusLearn account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={next} portal="student" />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-primary hover:underline">
            Register
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
