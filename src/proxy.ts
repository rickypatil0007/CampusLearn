import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PROTECTED_PREFIXES = [
  "/dashboard", "/subjects", "/resources", "/quizzes", "/assignments",
  "/previous-papers", "/announcements", "/bookmarks", "/notifications",
  "/ai", "/analytics", "/profile", "/settings", "/faculty", "/admin",
];

const FACULTY_PREFIX = "/faculty";
const ADMIN_PREFIX = "/admin";

export async function proxy(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

  if (isProtected && !user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Coarse route-prefix gating for UX only (fast redirect without a DB
  // round-trip). This is NOT the authorization boundary — every Server
  // Action/Route Handler under /faculty and /admin re-checks the caller's
  // role from the database independently (see lib/auth/session.ts), so a
  // request that somehow bypasses this middleware still cannot mutate data.
  if ((pathname.startsWith(FACULTY_PREFIX) || pathname.startsWith(ADMIN_PREFIX)) && user) {
    // Role is verified server-side in each route's layout/page via
    // requireRoleOrRedirect(); middleware intentionally avoids a DB call
    // per request for latency reasons.
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
