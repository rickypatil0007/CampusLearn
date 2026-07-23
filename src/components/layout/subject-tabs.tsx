"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Overview", suffix: "" },
  { label: "Resources", suffix: "/resources" },
  { label: "Quizzes", suffix: "/quizzes" },
  { label: "Assignments", suffix: "/assignments" },
  { label: "Discussion", suffix: "/discussion" },
];

export function SubjectTabs({ subjectId }: { subjectId: string }) {
  const pathname = usePathname();
  const base = `/subjects/${subjectId}`;
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-border">
      {TABS.map((tab) => {
        const href = base + tab.suffix;
        const isActive = pathname === href;
        return (
          <Link
            key={tab.suffix}
            href={href}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              isActive ? "border-primary text-foreground font-medium" : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
