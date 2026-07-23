import type { Metadata } from "next";
import {
  FileText, ListChecks, ClipboardList, Archive, Megaphone, MessageCircle,
  Sparkles, BarChart3, Bell, Search,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Features" };

const FEATURES = [
  { icon: FileText, title: "Resource Library", desc: "Lecture notes, slides, lab manuals, question banks, formula sheets, and reference links — searchable, filterable, and reviewed before publication." },
  { icon: ListChecks, title: "Quizzes & Assessments", desc: "MCQ, multiple-select, true/false, fill-in-the-blank, and descriptive questions, with server-side scoring so answers are never exposed early." },
  { icon: ClipboardList, title: "Assignments", desc: "Multi-file submissions, resubmission rules, late-submission policies, and structured Faculty feedback." },
  { icon: Archive, title: "Previous-Year Papers", desc: "Browse by department, programme, semester, and subject, with Faculty-flagged important and repeated questions." },
  { icon: Megaphone, title: "Announcements", desc: "Targeted by department, semester, division, or subject, with priority levels and CR-submission approval." },
  { icon: MessageCircle, title: "Discussion & Doubts", desc: "Subject-specific Q&A with upvotes, Faculty-verified answers, and moderation." },
  { icon: Sparkles, title: "AI Study Tools", desc: "Grounded summarizer, quiz-draft generator for Faculty review, a citation-backed doubt assistant, and a personalized study planner." },
  { icon: BarChart3, title: "Analytics", desc: "Student-level strong/weak topics and Faculty-level class performance trends, built from real quiz and assignment data." },
  { icon: Bell, title: "Notifications", desc: "New resources, quiz and assignment deadlines, grading, approvals, and Faculty replies — with per-category preferences." },
  { icon: Search, title: "Global Search", desc: "Search resources, subjects, announcements, previous-year papers, and discussions in one place." },
];

export default function FeaturesPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-semibold text-foreground">Features</h1>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">Everything CampusLearn brings together for TCET students, Class Representatives, Faculty, and Administrators.</p>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f) => (
          <Card key={f.title}>
            <CardHeader>
              <f.icon className="h-6 w-6 text-primary" />
              <CardTitle className="text-foreground normal-case text-base">{f.title}</CardTitle>
              <CardDescription>{f.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
