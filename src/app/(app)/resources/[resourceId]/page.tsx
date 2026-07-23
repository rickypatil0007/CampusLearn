import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, ExternalLink, ShieldCheck, Users as UsersIcon, Sparkles } from "lucide-react";
import { requireUserOrRedirect } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatBytes } from "@/lib/utils";
import { DownloadButton } from "./download-button";
import { SummarizePanel } from "./summarize-panel";
import { BookmarkButton } from "./bookmark-button";
import { recordResourceViewAction } from "../_actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Resource" };

export default async function ResourceDetailPage({ params }: { params: Promise<{ resourceId: string }> }) {
  const { resourceId } = await params;
  const user = await requireUserOrRedirect();
  const supabase = await createClient();

  const { data: resource } = await supabase
    .from("resources")
    .select("id, title, description, resource_type, approval_status, is_verified, is_cr_contributed, external_url, file_path, file_size_bytes, mime_type, created_at, uploaded_by, subject_id, subjects:subject_id(name, code), profiles:uploaded_by(full_name)")
    .eq("id", resourceId)
    .maybeSingle();

  if (!resource) notFound();

  const isOwner = resource.uploaded_by === user.id;
  const isStaff = ["faculty", "dept_admin", "super_admin"].includes(user.role);
  if (resource.approval_status !== "approved" && !isOwner && !isStaff) notFound();

  const { data: bookmark } = await supabase.from("resource_bookmarks").select("id").eq("resource_id", resourceId).eq("user_id", user.id).maybeSingle();

  if (resource.approval_status === "approved") {
    await recordResourceViewAction(resourceId);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-foreground">{resource.title}</h1>
            {resource.is_verified && <Badge variant="success"><ShieldCheck className="h-3 w-3" /> Verified</Badge>}
            {resource.is_cr_contributed && <Badge variant="muted"><UsersIcon className="h-3 w-3" /> CR contributed</Badge>}
            {resource.approval_status !== "approved" && <Badge variant="warning">{resource.approval_status.replace("_", " ")}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {(resource.subjects as unknown as { name: string; code: string } | null)?.name} · Uploaded by {(resource.profiles as unknown as { full_name: string } | null)?.full_name} · {formatDate(resource.created_at)}
          </p>
        </div>
        <BookmarkButton resourceId={resource.id} initialBookmarked={!!bookmark} />
      </div>

      <Card>
        <CardHeader><CardTitle>Description</CardTitle></CardHeader>
        <CardContent className="text-sm text-foreground">{resource.description || "No description provided."}</CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>File</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          {resource.external_url ? (
            <a href={resource.external_url} target="_blank" rel="noopener noreferrer nofollow">
              <Button variant="outline"><ExternalLink className="h-4 w-4" /> Open link</Button>
            </a>
          ) : resource.file_path ? (
            <>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {resource.mime_type} · {resource.file_size_bytes ? formatBytes(resource.file_size_bytes) : "—"}
              </div>
              <DownloadButton resourceId={resource.id} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No file attached.</p>
          )}
        </CardContent>
      </Card>

      {resource.approval_status === "approved" && (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Study Tools</CardTitle></CardHeader>
          <CardContent><SummarizePanel resourceId={resource.id} /></CardContent>
        </Card>
      )}
    </div>
  );
}
