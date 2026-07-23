import type { Metadata } from "next";
import { LoginForm } from "../login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Class Rep Log in" };

export default async function ClassRepLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Class Representative Log in</CardTitle>
        <CardDescription>Access your CampusLearn CR account.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm nextPath={next} portal="class_rep" />
      </CardContent>
    </Card>
  );
}
