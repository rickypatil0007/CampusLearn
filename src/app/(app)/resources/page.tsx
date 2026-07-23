import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { ResourceList } from "@/components/resources/resource-list";

export const metadata: Metadata = { title: "Resources" };

export default async function ResourcesPage() {
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Resource Library</h1>
        <p className="text-sm text-muted-foreground">Verified notes, slides, and reference material across your subjects.</p>
      </div>
      <ResourceList />
    </div>
  );
}
