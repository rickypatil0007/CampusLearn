"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function StudyPlanForm({ subjects }: { subjects: { id: string; name: string }[] }) {
  const router = useRouter();
  const [examDate, setExamDate] = useState("");
  const [dailyHours, setDailyHours] = useState(2);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [preferredDays, setPreferredDays] = useState<string[]>(DAYS);
  const [isPending, startTransition] = useTransition();

  function generate() {
    if (!examDate || selectedSubjects.length === 0) {
      toast.error("Select an exam date and at least one subject.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/study-plan", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            examDate, subjectIds: selectedSubjects, dailyHours,
            confidenceBySubject: Object.fromEntries(selectedSubjects.map((id) => [id, 3])), preferredDays,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not generate plan.");
        toast.success("Study plan generated.");
        router.refresh();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not generate plan.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div><Label>Exam date</Label><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
      <div><Label>Daily study hours</Label><Input type="number" min={0.5} max={12} step={0.5} value={dailyHours} onChange={(e) => setDailyHours(Number(e.target.value))} /></div>
      <div>
        <Label>Subjects</Label>
        <div className="mt-1 space-y-1">
          {subjects.map((s) => (
            <label key={s.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selectedSubjects.includes(s.id)}
                onCheckedChange={(v) => setSelectedSubjects((prev) => (v ? [...prev, s.id] : prev.filter((id) => id !== s.id)))}
              />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <Label>Preferred study days</Label>
        <div className="mt-1 flex flex-wrap gap-3">
          {DAYS.map((d) => (
            <label key={d} className="flex items-center gap-1 text-sm">
              <Checkbox checked={preferredDays.includes(d)} onCheckedChange={(v) => setPreferredDays((prev) => (v ? [...prev, d] : prev.filter((day) => day !== d)))} />
              {d}
            </label>
          ))}
        </div>
      </div>
      <Button onClick={generate} disabled={isPending}>{isPending ? "Generating…" : "Generate plan"}</Button>
    </div>
  );
}
