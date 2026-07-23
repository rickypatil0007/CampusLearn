import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterForm } from "./register-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export const metadata: Metadata = { title: "Register" };

export default async function RegisterPage() {
  const supabase = await createClient();

  const { data: rpcData, error } = await supabase.rpc("get_registration_academic_data");

  const data = rpcData || {
    departments: [],
    programmes: [],
    academic_years: [],
    years_of_study: [],
    semesters: [],
    divisions: []
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground text-xl normal-case">Create your account</CardTitle>
        <CardDescription>Registration is available only for verified @tcetmumbai.in institutional email addresses.</CardDescription>
      </CardHeader>
      <CardContent>
        {(!data.departments || data.departments.length === 0) && (
          <Alert className="mb-4">
            <AlertDescription>
              Academic structure has not been seeded yet. Run the seed script, or an administrator must add
              departments, programmes, semesters, and divisions before students can register.
            </AlertDescription>
          </Alert>
        )}
        <RegisterForm
          departments={data.departments ?? []}
          programmes={data.programmes ?? []}
          academicYears={data.academic_years ?? []}
          yearsOfStudy={data.years_of_study ?? []}
          semesters={data.semesters ?? []}
          divisions={data.divisions ?? []}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
