import Link from "next/link";
import { FileText, Download, Eye, ShieldCheck, Users as UsersIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/metric-card";
import { formatDate } from "@/lib/utils";

const RESOURCE_TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture Notes", presentation_slides: "Slides", lab_manual: "Lab Manual",
  assignment_sheet: "Assignment Sheet", question_bank: "Question Bank", previous_year_paper: "Previous Year Paper",
  model_answer: "Model Answer", formula_sheet: "Formula Sheet", reference_material: "Reference",
  youtube_link: "YouTube", useful_website: "Website", syllabus: "Syllabus", revision_notes: "Revision Notes",
};

export async function ResourceList({ subjectId, resourceType }: { subjectId?: string; resourceType?: string }) {
  const supabase = await createClient();
  let query = supabase
    .from("resources")
    .select("id, title, description, resource_type, is_verified, is_cr_contributed, view_count, download_count, created_at, subjects:subject_id(name, code)")
    .eq("approval_status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  if (subjectId) query = query.eq("subject_id", subjectId);
  if (resourceType) query = query.eq("resource_type", resourceType);

  const { data: resources } = await query;

  if (!resources || resources.length === 0) {
    return <EmptyState icon={FileText} title="No resources yet" description="Approved resources will appear here once uploaded." />;
  }

  return (
    <div className="space-y-3">
      {resources.map((r) => (
        <Link key={r.id} href={`/resources/${r.id}`}>
          <Card className="transition-colors hover:border-primary/50">
            <CardContent className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-medium text-foreground">{r.title}</p>
                  {r.is_verified && <Badge variant="success"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
                  {r.is_cr_contributed && <Badge variant="muted"><UsersIcon className="h-3 w-3" /> CR</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.description}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="font-mono-label text-primary">{RESOURCE_TYPE_LABELS[r.resource_type] ?? r.resource_type}</span>
                  {!subjectId && <span>{(r.subjects as unknown as { code: string } | null)?.code}</span>}
                  <span>{formatDate(r.created_at)}</span>
                  <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {r.view_count}</span>
                  <span className="flex items-center gap-1"><Download className="h-3 w-3" /> {r.download_count}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
