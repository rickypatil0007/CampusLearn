import type { Metadata } from "next";
import Link from "next/link";
import {
  FileText, ListChecks, ClipboardList, Archive, Sparkles, ShieldCheck,
  Users, GraduationCap, BarChart3, MessageCircle, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "CampusLearn — One campus. One learning platform." };

const FEATURES = [
  { icon: FileText, title: "Resource Library", desc: "Verified notes, slides, lab manuals, and previous-year papers in one searchable place." },
  { icon: ListChecks, title: "Quizzes & Assessments", desc: "Timed quizzes with server-graded results and instant, honest feedback." },
  { icon: ClipboardList, title: "Assignments", desc: "Submit, track deadlines, and receive Faculty feedback without the email back-and-forth." },
  { icon: Archive, title: "Previous-Year Papers", desc: "Filter by department, semester, and subject to focus your revision." },
  { icon: MessageCircle, title: "Discussion & Doubts", desc: "Ask questions and get Faculty-verified answers, subject by subject." },
  { icon: BarChart3, title: "Performance Analytics", desc: "See strong and weak topics from real quiz data — not guesswork." },
];

const ROLE_BENEFITS = [
  { icon: GraduationCap, role: "Students", desc: "One place for notes, quizzes, assignments, and AI-assisted revision." },
  { icon: Users, role: "Class Representatives", desc: "Upload class resources and track their approval status transparently." },
  { icon: ShieldCheck, role: "Faculty", desc: "Publish verified material, grade efficiently, and see class-wide analytics." },
  { icon: BarChart3, role: "Administrators", desc: "Manage departments, roles, and institutional settings from one dashboard." },
];

const AI_FEATURES = [
  "AI note summarizer — quick summaries, key definitions, flashcards, and revision notes from approved material.",
  "AI quiz-question drafts for Faculty to review, edit, and approve — never auto-published.",
  "Grounded doubt assistant that only answers from resources you're authorized to see, with citations.",
  "Personalized study planner built around your exam dates and confidence per subject.",
];

const STEPS = [
  { step: "1", title: "Register with your TCET email", desc: "Only @tcetmumbai.in addresses can create an account." },
  { step: "2", title: "Get enrolled in your subjects", desc: "Your department, semester, and division are set up by administrators." },
  { step: "3", title: "Learn, submit, and track", desc: "Access resources, attempt quizzes, submit assignments, and follow your progress." },
];

export default function LandingPage() {
  return (
    <div>
      <section className="mx-auto max-w-5xl px-4 py-20 text-center sm:py-28">
        <Badge variant="outline" className="mx-auto">TCET · Institutional Access Only</Badge>
        <h1 className="mt-6 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          All your academic learning, <span className="text-primary">finally in one place.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Access verified notes, assignments, quizzes, previous-year papers, AI-powered study tools, and performance
          insights through one secure TCET learning platform.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link href="/auth/register"><Button size="lg">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
          <Link href="/features"><Button size="lg" variant="outline">Explore Features</Button></Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Registration is available only for verified @tcetmumbai.in institutional email addresses.
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <div className="grid gap-8 sm:grid-cols-2">
          <div>
            <p className="font-mono-label text-primary">The problem</p>
            <p className="mt-2 text-lg text-foreground">
              Notes scattered across WhatsApp groups, drives, and printouts. Deadlines tracked in three different
              apps. No single view of how you&apos;re actually doing.
            </p>
          </div>
          <div>
            <p className="font-mono-label text-primary">The CampusLearn solution</p>
            <p className="mt-2 text-lg text-foreground">
              One verified, role-aware platform for notes, assessments, and feedback — with AI tools that stay
              grounded in your institution&apos;s own approved material.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-5xl px-4">
          <h2 className="text-center font-mono-label text-primary">Core Features</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-mono-label text-primary">Built for every role on campus</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_BENEFITS.map((r) => (
            <Card key={r.role}>
              <CardContent className="p-5">
                <r.icon className="h-6 w-6 text-primary" />
                <p className="mt-3 font-medium text-foreground">{r.role}</p>
                <p className="mt-1 text-sm text-muted-foreground">{r.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="flex items-center justify-center gap-2 text-center font-mono-label text-primary">
            <Sparkles className="h-4 w-4" /> AI, kept honest
          </h2>
          <ul className="mx-auto mt-8 max-w-2xl space-y-3">
            {AI_FEATURES.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-foreground">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16">
        <h2 className="text-center font-mono-label text-primary">How it works</h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 font-mono text-primary">{s.step}</div>
              <p className="mt-3 font-medium text-foreground">{s.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-t border-border bg-surface py-16">
        <div className="mx-auto max-w-3xl px-4 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-mono-label text-primary">Security &amp; institutional access</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground">
            Every account is verified against a @tcetmumbai.in institutional email, server-side. Role permissions —
            Student, Class Representative, Faculty, Department Administrator, Super Administrator — are enforced on
            every request, not just hidden in the interface. Files are protected behind signed, time-limited links.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-semibold text-foreground">Ready to bring your academic life into one place?</h2>
        <div className="mt-6">
          <Link href="/auth/register"><Button size="lg">Get Started <ArrowRight className="h-4 w-4" /></Button></Link>
        </div>
      </section>
    </div>
  );
}
