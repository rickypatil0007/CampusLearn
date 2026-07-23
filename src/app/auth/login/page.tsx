import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { User, Shield, GraduationCap, Users } from "lucide-react";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Select Portal</CardTitle>
        <CardDescription>Choose your account type to log in.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/auth/login/student" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <User className="w-8 h-8 text-primary" />
            <div>
              <div className="font-medium">Student</div>
              <div className="text-sm text-muted-foreground">Access courses and resources</div>
            </div>
          </Link>
          <Link href="/auth/login/cr" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <Users className="w-8 h-8 text-primary" />
            <div>
              <div className="font-medium">Class Rep</div>
              <div className="text-sm text-muted-foreground">Manage class resources</div>
            </div>
          </Link>
          <Link href="/auth/login/faculty" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <GraduationCap className="w-8 h-8 text-primary" />
            <div>
              <div className="font-medium">Faculty</div>
              <div className="text-sm text-muted-foreground">Manage subjects and quizzes</div>
            </div>
          </Link>
          <Link href="/auth/login/admin" className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
            <Shield className="w-8 h-8 text-primary" />
            <div>
              <div className="font-medium">Admin</div>
              <div className="text-sm text-muted-foreground">Institution management</div>
            </div>
          </Link>
        </div>
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
