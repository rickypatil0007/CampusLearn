import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Institution Settings" };

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase.from("institution_settings").select("*").limit(1).maybeSingle();

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Institution Settings</h1>
        <p className="text-sm text-muted-foreground">Controls that apply across all of CampusLearn.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Platform configuration</CardTitle>
          <CardDescription>Super Administrator only. Changes are recorded in the audit log.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            initial={{
              aiFeaturesEnabled: settings?.ai_features_enabled ?? true,
              maxUploadSizeMb: settings?.max_upload_size_mb ?? 25,
              aiRequestsPerUserPerDay: settings?.ai_requests_per_user_per_day ?? 30,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
