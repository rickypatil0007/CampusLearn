import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PreferencesForm } from "./preferences-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();
  const { data: prefs } = await supabase.from("notification_preferences").select("*").eq("user_id", user.id).maybeSingle();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Notification preferences and account security.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Notifications</CardTitle></CardHeader>
        <CardContent>
          <PreferencesForm
            initial={{
              emailEnabled: prefs?.email_enabled ?? true, resourceUpdates: prefs?.resource_updates ?? true,
              quizUpdates: prefs?.quiz_updates ?? true, assignmentUpdates: prefs?.assignment_updates ?? true,
              announcementUpdates: prefs?.announcement_updates ?? true, discussionUpdates: prefs?.discussion_updates ?? true,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Security</CardTitle><CardDescription>Change your password via the reset flow.</CardDescription></CardHeader>
        <CardContent><Link href="/auth/forgot-password"><Button variant="outline">Reset password</Button></Link></CardContent>
      </Card>
    </div>
  );
}
