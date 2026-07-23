import type { Metadata } from "next";
import { LoginForm } from "../login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Faculty Log in" };

export default async function FacultyLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Faculty Log in</CardTitle>
        <CardDescription>Access your CampusLearn faculty account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={next} portal="faculty" />
      </CardContent>
    </Card>
  );
}
