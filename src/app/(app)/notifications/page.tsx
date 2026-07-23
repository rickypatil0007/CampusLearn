import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDateTime, cn } from "@/lib/utils";
import { NotificationActions } from "./notification-actions";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();
  const { data: notifications } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Notifications</h1>
          <p className="text-sm text-muted-foreground">Resource, quiz, assignment, and announcement updates.</p>
        </div>
        <NotificationActions />
      </div>
      {notifications && notifications.length > 0 ? (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Card key={n.id} className={cn(!n.is_read && "border-primary/40")}>
              <CardContent className="flex items-start justify-between gap-4 p-4">
                <div>
                  <p className={cn("text-sm font-medium", n.is_read ? "text-muted-foreground" : "text-foreground")}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(n.created_at)}</p>
                </div>
                {!n.is_read && <NotificationDot id={n.id} />}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bell} title="No notifications yet" />
      )}
    </div>
  );
}

function NotificationDot({ id }: { id: string }) {
  return <span data-notification-id={id} className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />;
}
