"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { Sidebar, SidebarContent } from "@/components/layout/sidebar";
import { Header, type HeaderUser } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import type { Role } from "@/lib/permissions/roles";

export function AppShell({
  role, headerUser, unreadCount, children,
}: {
  role: Role;
  headerUser: HeaderUser;
  unreadCount: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar role={role} />

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 w-72 bg-surface shadow-xl">
            <div className="flex justify-end p-2">
              <Button variant="ghost" size="icon" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <SidebarContent role={role} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={headerUser} unreadCount={unreadCount} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}
