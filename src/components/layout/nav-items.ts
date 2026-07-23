import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard, BookOpen, FileText, ListChecks, ClipboardList, Archive,
  Megaphone, Bookmark, Bell, Sparkles, CalendarClock, BarChart3, User,
  Settings, Upload, CheckSquare, Users, Building2, GraduationCap, Shield,
  UserPlus, ScrollText, Cpu,
} from "lucide-react";
import type { Role } from "@/lib/permissions/roles";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

export const STUDENT_NAV: NavSection[] = [
  { items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Subjects", href: "/subjects", icon: BookOpen },
    { label: "Resources", href: "/resources", icon: FileText },
    { label: "Quizzes", href: "/quizzes", icon: ListChecks },
    { label: "Assignments", href: "/assignments", icon: ClipboardList },
    { label: "Previous Papers", href: "/previous-papers", icon: Archive },
    { label: "Announcements", href: "/announcements", icon: Megaphone },
    { label: "Discussion", href: "/discussions", icon: Users },
  ]},
  { title: "AI Tools", items: [
    { label: "AI Assistant", href: "/ai/assistant", icon: Sparkles },
    { label: "Study Planner", href: "/ai/study-planner", icon: CalendarClock },
  ]},
  { title: "You", items: [
    { label: "Bookmarks", href: "/bookmarks", icon: Bookmark },
    { label: "Notifications", href: "/notifications", icon: Bell },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
  ]},
];

export const CR_EXTRA_NAV: NavItem[] = [
  { label: "Upload Resource", href: "/resources/new", icon: Upload },
];

export const FACULTY_NAV: NavSection[] = [
  { title: "Teaching", items: [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "My Subjects", href: "/subjects", icon: BookOpen },
    { label: "Resources", href: "/faculty/resources", icon: FileText },
    { label: "Quizzes", href: "/faculty/quizzes", icon: ListChecks },
    { label: "Assignments", href: "/faculty/assignments", icon: ClipboardList },
    { label: "Approvals", href: "/faculty/approvals", icon: CheckSquare },
    { label: "Announcements", href: "/announcements", icon: Megaphone },
    { label: "Discussion", href: "/discussions", icon: Users },
  ]},
  { title: "AI Tools", items: [
    { label: "AI Assistant", href: "/ai/assistant", icon: Sparkles },
  ]},
  { title: "Insights", items: [
    { label: "Analytics", href: "/faculty/analytics", icon: BarChart3 },
    { label: "Notifications", href: "/notifications", icon: Bell },
  ]},
];

export const ADMIN_NAV: NavSection[] = [
  { title: "Administration", items: [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Users", href: "/admin/users", icon: Users },
    { label: "Faculty Management", href: "/admin/faculty", icon: GraduationCap },
    { label: "Faculty Assignments", href: "/admin/faculty-assignments", icon: ClipboardList },
    { label: "Suspensions", href: "/admin/suspensions", icon: Shield },
    { label: "Class Assignments", href: "/admin/class-assignments", icon: ClipboardList },
    { label: "Departments", href: "/admin/departments", icon: Building2 },
    { label: "Programmes", href: "/admin/programmes", icon: GraduationCap },
    { label: "Subjects", href: "/admin/subjects", icon: BookOpen },
    { label: "Roles", href: "/admin/roles", icon: Shield },
    { label: "Invitations", href: "/admin/invitations", icon: UserPlus },
    { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
    { label: "AI Usage", href: "/admin/ai-usage", icon: Cpu },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ]},
];

export function getNavForRole(role: Role): NavSection[] {
  switch (role) {
    case "student":
      return STUDENT_NAV;
    case "class_rep":
      return STUDENT_NAV.map((section, i) =>
        i === 0 ? { ...section, items: [...section.items, ...CR_EXTRA_NAV] } : section
      );
    case "faculty":
      return FACULTY_NAV;
    case "dept_admin":
    case "super_admin":
      return ADMIN_NAV;
    default:
      return STUDENT_NAV;
  }
}

export const BOTTOM_NAV: NavItem[] = [
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];
