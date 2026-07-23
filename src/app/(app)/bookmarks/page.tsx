import type { Metadata } from "next";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/metric-card";

export const metadata: Metadata = { title: "Bookmarks" };

export default async function BookmarksPage() {
  const user = await requireUserOrRedirect();
  const supabase = await createClient();
  const { data: bookmarks } = await supabase
    .from("resource_bookmarks")
    .select("id, resources(id, title, resource_type, subjects:subject_id(code))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const items = (bookmarks ?? []).map((b) => (b as unknown as { resources: { id: string; title: string; resource_type: string; subjects: { code: string } | null } }).resources).filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Bookmarks</h1>
        <p className="text-sm text-muted-foreground">Resources you&apos;ve saved for later.</p>
      </div>
      {items.length > 0 ? (
        <div className="space-y-3">
          {items.map((r) => (
            <Link key={r.id} href={`/resources/${r.id}`}>
              <Card className="transition-colors hover:border-primary/50">
                <CardContent className="flex items-center justify-between p-4">
                  <p className="font-medium text-foreground">{r.title}</p>
                  <span className="text-xs text-muted-foreground">{r.subjects?.code}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState icon={Bookmark} title="No bookmarks yet" description="Bookmark resources from the resource library to find them here." />
      )}
    </div>
  );
}
