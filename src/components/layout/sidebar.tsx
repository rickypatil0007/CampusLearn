"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/branding/logo";
import { getNavForRole, BOTTOM_NAV } from "@/components/layout/nav-items";
import type { Role } from "@/lib/permissions/roles";
import { ROLE_LABELS } from "@/lib/permissions/roles";

function NavLink({ href, label, icon: Icon, onNavigate }: { href: string; label: string; icon: React.ComponentType<{ className?: string }>; onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== "/dashboard" && href !== "/admin" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-primary text-primary-foreground font-medium"
          : "text-muted-foreground hover:bg-accent hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{label}</span>
    </Link>
  );
}

export function SidebarContent({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const sections = getNavForRole(role);
  return (
    <div className="flex h-full flex-col">
      <div className="px-4 py-5">
        <Logo />
      </div>
      <nav className="scrollbar-thin flex-1 space-y-6 overflow-y-auto px-3 pb-4">
        {sections.map((section, i) => (
          <div key={i} className="space-y-1">
            {section.title && (
              <p className="font-mono-label px-3 pb-1 text-muted-foreground">{section.title}</p>
            )}
            {section.items.map((item) => (
              <NavLink key={item.href} {...item} onNavigate={onNavigate} />
            ))}
          </div>
        ))}
      </nav>
      <div className="space-y-1 border-t border-border px-3 py-3">
        <p className="font-mono-label px-3 pb-1 text-muted-foreground">{ROLE_LABELS[role]}</p>
        {BOTTOM_NAV.map((item) => (
          <NavLink key={item.href} {...item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function Sidebar({ role }: { role: Role }) {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
      <SidebarContent role={role} />
    </aside>
  );
}
