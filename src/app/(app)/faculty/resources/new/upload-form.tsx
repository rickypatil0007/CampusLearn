"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RESOURCE_TYPES } from "@/lib/validation/resources";
import { uploadResourceAction } from "../../../resources/_actions";

interface SubjectOption { id: string; name: string; code: string; units: { id: string; title: string }[] }

const TYPE_LABELS: Record<string, string> = {
  lecture_notes: "Lecture Notes", presentation_slides: "Presentation Slides", lab_manual: "Lab Manual",
  assignment_sheet: "Assignment Sheet", question_bank: "Question Bank", previous_year_paper: "Previous Year Paper",
  model_answer: "Model Answer", formula_sheet: "Formula Sheet", reference_material: "Reference Material",
  youtube_link: "YouTube Link", useful_website: "Useful Website", syllabus: "Syllabus", revision_notes: "Revision Notes",
};

export function UploadResourceForm({ subjects }: { subjects: SubjectOption[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const [resourceType, setResourceType] = useState("lecture_notes");
  const [subjectId, setSubjectId] = useState("");
  const isLinkType = resourceType === "youtube_link" || resourceType === "useful_website";
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(formData) =>
        startTransition(async () => {
          const result = await uploadResourceAction(formData);
          if (!result.ok) { toast.error(result.error); return; }
          toast.success("Resource submitted.");
          formRef.current?.reset();
          router.push(`/resources/${result.data.resourceId}`);
        })
      }
    >
      <div><Label htmlFor="title">Title</Label><Input id="title" name="title" required /></div>
      <div><Label htmlFor="description">Description</Label><Textarea id="description" name="description" /></div>

      <div>
        <Label>Resource type</Label>
        <Select name="resourceType" value={resourceType} onValueChange={setResourceType}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
        </Select>
        <input type="hidden" name="resourceType" value={resourceType} />
      </div>

      <div>
        <Label>Subject</Label>
        <Select value={subjectId} onValueChange={setSubjectId}>
          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
          <SelectContent>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}</SelectContent>
        </Select>
        <input type="hidden" name="subjectId" value={subjectId} />
      </div>

      {selectedSubject && selectedSubject.units.length > 0 && (
        <div>
          <Label>Unit (optional)</Label>
          <Select name="unitId">
            <SelectTrigger><SelectValue placeholder="Select unit" /></SelectTrigger>
            <SelectContent>{selectedSubject.units.map((u) => <SelectItem key={u.id} value={u.id}>{u.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      )}

      {isLinkType ? (
        <div><Label htmlFor="externalUrl">URL</Label><Input id="externalUrl" name="externalUrl" type="url" placeholder="https://…" required /></div>
      ) : (
        <div><Label htmlFor="file">File</Label><Input id="file" name="file" type="file" accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png" /></div>
      )}

      <div><Label htmlFor="tags">Tags (comma-separated)</Label><Input id="tags" name="tags" placeholder="unit-1, exam-prep" /></div>

      <Button type="submit" disabled={isPending || !subjectId}>{isPending ? "Uploading…" : "Submit resource"}</Button>
    </form>
  );
}
