import type { Metadata } from "next";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { ResourceList } from "@/components/resources/resource-list";

export const metadata: Metadata = { title: "Previous Year Papers" };

export default async function PreviousPapersPage() {
  await requireUserOrRedirect();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Previous Year Papers</h1>
        <p className="text-sm text-muted-foreground">Examination papers shared by Faculty across your subjects.</p>
      </div>
      <ResourceList resourceType="previous_year_paper" />
    </div>
  );
}
